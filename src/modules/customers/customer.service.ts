import { randomInt } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { AddressInput } from '@vyora/shared';
import type { Channels } from '../../infrastructure/messaging/channels';
import { badRequest, businessRule, conflict, notFound } from '../../shared/errors';
import { sha256 } from '../../shared/crypto';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';
import type { StorefrontService } from '../catalog/storefront.service';

const MAX_ADDRESSES = 20;

export class CustomerService {
  constructor(
    private readonly db: PrismaClient,
    private readonly auth: AuthService,
    private readonly storefront: StorefrontService,
    private readonly channels: Channels,
    private readonly audit: AuditService,
  ) {}

  // ── Profile ────────────────────────────────────────────────
  async profile(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
        createdAt: true,
        deletionRequestedAt: true,
        customerProfile: true,
      },
    });
    return user;
  }

  async updateProfile(userId: string, input: { name?: string; phone?: string; gender?: string; dateOfBirth?: Date | null }) {
    const current = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (input.phone && input.phone !== current.phone) {
      const taken = await this.db.user.findUnique({ where: { phone: input.phone } });
      if (taken) throw conflict('This phone number is already registered');
    }
    await this.db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        ...(input.phone && input.phone !== current.phone ? { phone: input.phone, phoneVerifiedAt: null } : {}),
        customerProfile: {
          upsert: {
            create: { gender: input.gender as never, dateOfBirth: input.dateOfBirth ?? null },
            update: { gender: input.gender as never, dateOfBirth: input.dateOfBirth },
          },
        },
      },
    });
    this.auth.invalidatePrincipal(userId);
    return this.profile(userId);
  }

  // ── Phone verification (OTP over the configured SMS channel; console in development) ──
  async requestPhoneOtp(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.phone) throw businessRule('Add a phone number to your profile first');
    if (user.phoneVerifiedAt) throw businessRule('Your phone number is already verified');
    const otp = String(randomInt(100000, 1000000));
    await this.db.verificationToken.updateMany({ where: { userId, type: 'PHONE_OTP', usedAt: null }, data: { usedAt: new Date() } });
    // The hash binds the code to the user, so identical codes for different users never collide.
    await this.db.verificationToken.deleteMany({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    await this.db.verificationToken.create({
      data: { userId, type: 'PHONE_OTP', tokenHash: sha256(`otp:${userId}:${otp}`), expiresAt: new Date(Date.now() + 10 * 60_000) },
    });
    await this.channels.sms.send({ to: user.phone, text: `Your Vyora verification code is ${otp}. It expires in 10 minutes.` });
    return { sentTo: `******${user.phone.slice(-4)}`, expiresInSeconds: 600 };
  }

  async verifyPhoneOtp(userId: string, otp: string) {
    if (!/^\d{6}$/.test(otp)) throw badRequest('Enter the 6-digit code');
    const row = await this.db.verificationToken.findUnique({ where: { tokenHash: sha256(`otp:${userId}:${otp}`) } });
    if (!row || row.userId !== userId || row.usedAt || row.expiresAt < new Date()) throw badRequest('The code is incorrect or has expired');
    await this.db.verificationToken.updateMany({ where: { userId, type: 'PHONE_OTP', usedAt: null }, data: { usedAt: new Date() } });
    await this.db.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } });
  }

  /** GDPR-style deletion request: the account is flagged and signed out; an admin completes it. */
  async requestDeletion(userId: string, actor: AuditActor) {
    const openOrders = await this.db.order.count({
      where: { customerId: userId, status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'] } },
    });
    if (openOrders) throw businessRule('Please wait until your open orders are delivered or cancelled before deleting your account');
    const seller = await this.db.seller.findUnique({ where: { userId } });
    if (seller && seller.status === 'APPROVED') throw businessRule('Seller accounts must be deactivated by an admin before deletion');
    await this.db.user.update({ where: { id: userId }, data: { status: 'DELETION_REQUESTED', deletionRequestedAt: new Date() } });
    await this.audit.record(actor, { action: 'user.deletion_requested', entityType: 'User', entityId: userId });
    await this.auth.revokeAllSessions(userId);
  }

  // ── Addresses ──────────────────────────────────────────────
  listAddresses(userId: string) {
    return this.db.customerAddress.findMany({ where: { userId, deletedAt: null }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
  }

  async createAddress(userId: string, input: AddressInput) {
    const count = await this.db.customerAddress.count({ where: { userId, deletedAt: null } });
    if (count >= MAX_ADDRESSES) throw businessRule(`You can save up to ${MAX_ADDRESSES} addresses`);
    return this.db.$transaction(async (tx) => {
      const makeDefault = input.isDefault || count === 0;
      if (makeDefault && count > 0) await tx.customerAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.create({ data: { ...input, userId, isDefault: makeDefault } });
    });
  }

  async updateAddress(userId: string, id: string, input: AddressInput) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound('Address');
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id }, data: { ...input, isDefault: input.isDefault || existing.isDefault } });
    });
  }

  async setDefaultAddress(userId: string, id: string) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound('Address');
    await this.db.$transaction([
      this.db.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.db.customerAddress.update({ where: { id }, data: { isDefault: true } }),
    ]);
  }

  async deleteAddress(userId: string, id: string) {
    const existing = await this.db.customerAddress.findFirst({ where: { id, userId, deletedAt: null } });
    if (!existing) throw notFound('Address');
    await this.db.customerAddress.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
    if (existing.isDefault) {
      const next = await this.db.customerAddress.findFirst({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
      if (next) await this.db.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  // ── Wishlist ───────────────────────────────────────────────
  private async wishlistId(userId: string) {
    const w = await this.db.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
    return w.id;
  }

  async wishlist(userId: string) {
    const id = await this.wishlistId(userId);
    const items = await this.db.wishlistItem.findMany({
      where: { wishlistId: id, product: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: { productId: true, createdAt: true },
    });
    const products = await this.db.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: {
        id: true, slug: true, title: true, minPrice: true, maxMrp: true, maxDiscountPct: true, inStock: true, ratingAvg: true,
        ratingCount: true, soldCount: true, isFeatured: true, publishedAt: true, codAvailable: true, status: true,
        brand: { select: { name: true, slug: true } }, category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 2, select: { url: true, storageKey: true, alt: true } },
      },
    });
    const cards = await this.storefront.toCards(products);
    return items
      .map((i) => {
        const card = cards.find((c) => c.id === i.productId);
        const p = products.find((x) => x.id === i.productId);
        return card ? { ...card, addedAt: i.createdAt, available: p?.status === 'APPROVED' && p.minPrice !== null } : null;
      })
      .filter(Boolean);
  }

  async wishlistIds(userId: string) {
    const w = await this.db.wishlist.findUnique({ where: { userId }, include: { items: { select: { productId: true } } } });
    return w?.items.map((i) => i.productId) ?? [];
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null, status: 'APPROVED' } });
    if (!product) throw notFound('Product');
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: id, productId } }, create: { wishlistId: id, productId }, update: {} });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const id = await this.wishlistId(userId);
    await this.db.wishlistItem.deleteMany({ where: { wishlistId: id, productId } });
  }

  // ── Recently viewed ────────────────────────────────────────
  async recordView(userId: string, productId: string) {
    await this.db.recentlyViewedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { viewedAt: new Date() },
    });
    // Keep the most recent 50.
    const stale = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: 'desc' }, skip: 50, select: { id: true } });
    if (stale.length) await this.db.recentlyViewedProduct.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }

  async recentlyViewed(userId: string, limit = 12) {
    const rows = await this.db.recentlyViewedProduct.findMany({ where: { userId }, orderBy: { viewedAt: 'desc' }, take: limit, select: { productId: true } });
    const products = await this.db.product.findMany({
      where: { id: { in: rows.map((r) => r.productId) }, status: 'APPROVED', deletedAt: null, minPrice: { not: null } },
      select: {
        id: true, slug: true, title: true, minPrice: true, maxMrp: true, maxDiscountPct: true, inStock: true, ratingAvg: true,
        ratingCount: true, soldCount: true, isFeatured: true, publishedAt: true, codAvailable: true,
        brand: { select: { name: true, slug: true } }, category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 2, select: { url: true, storageKey: true, alt: true } },
      },
    });
    const cards = await this.storefront.toCards(products);
    return rows.map((r) => cards.find((c) => c.id === r.productId)).filter(Boolean);
  }

  async subscribeStock(userId: string, productId: string) {
    const product = await this.db.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw notFound('Product');
    await this.db.stockSubscription.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { notifiedAt: null },
    });
  }
}
