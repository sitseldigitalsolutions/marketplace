import type { Prisma, PrismaClient, SellerStatus } from '@prisma/client';
import type { z } from 'zod';
import type { adminCreateSellerSchema, SellerRegistrationInput, sellerProfileUpdateSchema } from '@vyora/shared';
import { randomUUID } from 'node:crypto';
import type { StorageProvider } from '../../infrastructure/storage';
import { EXTENSIONS, storeOptimizedImage } from '../../infrastructure/storage';
import type { UploadedFile } from '../../http/types';
import { businessRule, conflict, notFound } from '../../shared/errors';
import { randomCode } from '../../shared/crypto';
import { num } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import { slugify } from '../../shared/text';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';
import type { ProductIndexer } from '../catalog/product-indexer';
import type { NotificationService } from '../notifications/notification.service';

type AdminCreateInput = z.infer<typeof adminCreateSellerSchema>;
type ProfileInput = z.infer<typeof sellerProfileUpdateSchema>;

/** Allowed admin status transitions for seller accounts. */
const TRANSITIONS: Record<SellerStatus, SellerStatus[]> = {
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED', 'INACTIVE'],
  REJECTED: ['APPROVED', 'PENDING_APPROVAL'],
  SUSPENDED: ['APPROVED', 'INACTIVE'],
  INACTIVE: ['APPROVED'],
};

export class SellerService {
  constructor(
    private readonly db: PrismaClient,
    private readonly auth: AuthService,
    private readonly storage: StorageProvider,
    private readonly indexer: ProductIndexer,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private async uniqueSlug(name: string) {
    const base = slugify(name) || 'store';
    for (let i = 0; i < 20; i++) {
      const slug = i === 0 ? base : `${base}-${randomCode(4).toLowerCase()}`;
      if (!(await this.db.seller.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async uniqueCode() {
    for (let i = 0; i < 10; i++) {
      const code = `SL${randomCode(6)}`;
      if (!(await this.db.seller.findUnique({ where: { code }, select: { id: true } }))) return code;
    }
    throw new Error('Could not allocate seller code');
  }

  /** Public self-registration → PENDING_APPROVAL. Also works for an existing customer account. */
  async register(input: SellerRegistrationInput, meta: { ip: string; userAgent: string | null }) {
    const existingUser = await this.db.user.findUnique({ where: { email: input.email }, include: { seller: true } });
    if (existingUser?.seller) throw conflict('A seller account already exists for this email');
    if (existingUser) throw conflict('An account with this email already exists. Sign in and apply from your account.');
    if (await this.db.user.findUnique({ where: { phone: input.phone } })) throw conflict('This phone number is already registered');

    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: 'SELLER' } }),
      this.db.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
    ]);
    const passwordHash = await this.auth.hashPassword(input.password);
    const slug = await this.uniqueSlug(input.businessName);
    const code = await this.uniqueCode();

    const user = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} },
        },
      });
      const seller = await tx.seller.create({
        data: {
          userId: u.id,
          code,
          slug,
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          termsAcceptedAt: new Date(),
          addresses: {
            create: {
              label: 'Registered',
              line1: input.addressLine1,
              line2: input.addressLine2 ?? null,
              city: input.city,
              state: input.state,
              pincode: input.pincode,
            },
          },
        },
      });
      await tx.sellerApproval.create({ data: { sellerId: seller.id, toStatus: 'PENDING_APPROVAL', reason: 'Self registration' } });
      await this.audit.record(
        { auth: null, ip: meta.ip, userAgent: meta.userAgent },
        { action: 'seller.register', entityType: 'Seller', entityId: seller.id, after: { businessName: input.businessName, email: input.email } },
        tx,
      );
      return u;
    });

    await this.auth.sendVerificationEmail(user.id);
    await this.notifications.notify({ key: 'seller.registered', userId: user.id, vars: { businessName: input.businessName }, link: '/seller' });
    await this.notifications.notifyAdmins({
      key: 'seller.registered_admin',
      vars: { businessName: input.businessName, email: input.email },
      link: '/admin/sellers?status=PENDING_APPROVAL',
    });
    return this.auth.issueSession(user.id, meta);
  }

  /** Existing customer applies to become a seller. */
  async applyAsExistingUser(userId: string, input: Omit<SellerRegistrationInput, 'name' | 'email' | 'password' | 'phone'> & { phone: string }) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { seller: true } });
    if (user.seller) throw conflict('You already have a seller account');
    const sellerRole = await this.db.role.findUniqueOrThrow({ where: { code: 'SELLER' } });
    const seller = await this.db.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: sellerRole.id } },
        create: { userId, roleId: sellerRole.id },
        update: {},
      });
      if (!user.phone) await tx.user.update({ where: { id: userId }, data: { phone: input.phone } });
      const s = await tx.seller.create({
        data: {
          userId,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: user.email,
          supportPhone: input.phone,
          termsAcceptedAt: new Date(),
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode },
          },
        },
      });
      await tx.sellerApproval.create({ data: { sellerId: s.id, toStatus: 'PENDING_APPROVAL', reason: 'Application from customer account' } });
      return s;
    });
    this.auth.invalidatePrincipal(userId);
    await this.notifications.notify({ key: 'seller.registered', userId, vars: { businessName: input.businessName }, link: '/seller' });
    await this.notifications.notifyAdmins({
      key: 'seller.registered_admin',
      vars: { businessName: input.businessName, email: user.email },
      link: '/admin/sellers?status=PENDING_APPROVAL',
    });
    return seller;
  }

  /** Admin-created seller: account without password + invitation link. */
  async adminCreate(input: AdminCreateInput, actor: AuditActor) {
    await this.auth.assertEmailAvailable(input.email, input.phone);
    const [sellerRole, customerRole] = await Promise.all([
      this.db.role.findUniqueOrThrow({ where: { code: 'SELLER' } }),
      this.db.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
    ]);
    const status: SellerStatus = input.autoApprove ? 'APPROVED' : 'PENDING_APPROVAL';
    const created = await this.db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: null,
          roles: { create: [{ roleId: sellerRole.id }, { roleId: customerRole.id }] },
          customerProfile: { create: {} },
        },
      });
      const s = await tx.seller.create({
        data: {
          userId: u.id,
          code: await this.uniqueCode(),
          slug: await this.uniqueSlug(input.businessName),
          businessName: input.businessName,
          displayName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin ?? null,
          pan: input.pan,
          supportEmail: input.email,
          supportPhone: input.phone,
          status,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          addresses: {
            create: { line1: input.addressLine1, line2: input.addressLine2 ?? null, city: input.city, state: input.state, pincode: input.pincode },
          },
        },
      });
      await tx.sellerApproval.create({ data: { sellerId: s.id, toStatus: status, reason: 'Created by admin', actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: 'seller.admin_create', entityType: 'Seller', entityId: s.id, after: input }, tx);
      return { user: u, seller: s };
    });
    const token = await this.auth.createOneTimeToken(created.user.id, 'SELLER_INVITE', 72 * 60);
    await this.notifications.notify({
      key: 'seller.invite',
      userId: created.user.id,
      channels: ['EMAIL'],
      vars: { businessName: input.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` },
    });
    return created.seller;
  }

  async resendInvite(sellerId: string, actor: AuditActor) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, include: { user: true } });
    if (!seller) throw notFound('Seller');
    if (seller.user.passwordHash) throw businessRule('This seller has already set a password');
    const token = await this.auth.createOneTimeToken(seller.userId, 'SELLER_INVITE', 72 * 60);
    await this.notifications.notify({
      key: 'seller.invite',
      userId: seller.userId,
      channels: ['EMAIL'],
      vars: { businessName: seller.businessName, link: `${this.notifications.frontendUrl}/accept-invite?token=${token}` },
    });
    await this.audit.record(actor, { action: 'seller.resend_invite', entityType: 'Seller', entityId: sellerId });
  }

  // ── Seller self-service ────────────────────────────────────
  async me(sellerId: string) {
    const seller = await this.db.seller.findUniqueOrThrow({
      where: { id: sellerId },
      include: {
        addresses: true,
        documents: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 10 },
        user: { select: { name: true, email: true, phone: true, emailVerifiedAt: true } },
      },
    });
    return { ...seller, ratingAvg: num(seller.ratingAvg), documents: seller.documents.map((d) => ({ ...d, storageKey: undefined })) };
  }

  async updateProfile(sellerId: string, input: ProfileInput, actor: AuditActor) {
    const before = await this.db.seller.findUniqueOrThrow({ where: { id: sellerId } });
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode,
      },
    });
    await this.audit.record(actor, { action: 'seller.profile_update', entityType: 'Seller', entityId: sellerId, before, after: updated });
    return updated;
  }

  async uploadLogo(sellerId: string, file: UploadedFile) {
    const stored = await storeOptimizedImage(this.storage, 'sellers', file.buffer, file.mimeType);
    return this.db.seller.update({ where: { id: sellerId }, data: { logoUrl: stored.url } });
  }

  /** KYC documents go to PRIVATE storage and are served only through short-lived signed URLs. */
  async uploadDocument(sellerId: string, type: string, file: UploadedFile, actor: AuditActor) {
    const key = `seller-docs/${sellerId}/${randomUUID()}${EXTENSIONS[file.mimeType] ?? ''}`;
    await this.storage.put(key, file.buffer, file.mimeType, 'private');
    const doc = await this.db.sellerDocument.create({
      data: {
        sellerId,
        type: type as never,
        storageKey: key,
        originalName: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.size,
      },
    });
    await this.audit.record(actor, { action: 'seller.document_upload', entityType: 'SellerDocument', entityId: doc.id, metadata: { type } });
    return { ...doc, storageKey: undefined };
  }

  /** Signed URL for a document. Sellers can only reach their own documents; admins any. */
  async documentUrl(documentId: string, scope: { sellerId: string | null }) {
    const doc = await this.db.sellerDocument.findFirst({
      where: { id: documentId, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
    });
    if (!doc) throw notFound('Document');
    return { url: await this.storage.signedUrl(doc.storageKey, 300), expiresInSeconds: 300 };
  }

  async deleteDocument(documentId: string, sellerId: string) {
    const doc = await this.db.sellerDocument.findFirst({ where: { id: documentId, sellerId } });
    if (!doc) throw notFound('Document');
    if (doc.status === 'VERIFIED') throw businessRule('Verified documents cannot be removed');
    await this.db.sellerDocument.delete({ where: { id: doc.id } });
    await this.storage.delete(doc.storageKey, 'private');
  }

  // ── Admin management ───────────────────────────────────────
  async list(q: { page: number; pageSize: number; q?: string; status?: SellerStatus; sort?: string }) {
    const where: Prisma.SellerWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.q
        ? {
            OR: [
              { businessName: { contains: q.q } },
              { displayName: { contains: q.q } },
              { code: { contains: q.q } },
              { gstin: { contains: q.q } },
              { user: { email: { contains: q.q } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.seller.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, lastLoginAt: true, passwordHash: true } },
          _count: { select: { listings: { where: { deletedAt: null } }, sellerOrders: true } },
        },
        orderBy: q.sort === 'oldest' ? { createdAt: 'asc' } : q.sort === 'name' ? { businessName: 'asc' } : { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.db.seller.count({ where }),
    ]);
    return paginated(
      items.map((s) => ({
        ...s,
        ratingAvg: num(s.ratingAvg),
        user: { ...s.user, passwordHash: undefined, invitePending: !s.user.passwordHash },
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async adminDetail(sellerId: string) {
    const seller = await this.db.seller.findFirst({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, emailVerifiedAt: true, createdAt: true } },
        addresses: true,
        documents: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        commissionRules: { where: { isActive: true } },
      },
    });
    if (!seller) throw notFound('Seller');
    const [products, orders, ledger] = await Promise.all([
      this.db.product.groupBy({ by: ['status'], where: { ownerSellerId: sellerId, deletedAt: null }, _count: { _all: true } }),
      this.db.sellerOrder.groupBy({ by: ['status'], where: { sellerId }, _count: { _all: true }, _sum: { grandTotal: true } }),
      this.db.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } }),
    ]);
    return {
      ...seller,
      ratingAvg: num(seller.ratingAvg),
      documents: seller.documents.map((d) => ({ ...d, storageKey: undefined })),
      stats: {
        products: Object.fromEntries(products.map((p) => [p.status, p._count._all])),
        orders: Object.fromEntries(orders.map((o) => [o.status, { count: o._count._all, value: num(o._sum.grandTotal) }])),
        balance: num(ledger._sum.amount),
      },
    };
  }

  async changeStatus(sellerId: string, to: SellerStatus, reason: string | undefined, actor: AuditActor) {
    const seller = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!seller) throw notFound('Seller');
    if (!TRANSITIONS[seller.status].includes(to)) {
      throw businessRule(`Cannot change a seller from ${seller.status} to ${to}`);
    }
    if ((to === 'REJECTED' || to === 'SUSPENDED') && !reason) throw businessRule('Please provide a reason');
    await this.db.$transaction(async (tx) => {
      const updated = await tx.seller.updateMany({
        where: { id: sellerId, status: seller.status },
        data: {
          status: to,
          statusReason: reason ?? null,
          approvedAt: to === 'APPROVED' && !seller.approvedAt ? new Date() : undefined,
        },
      });
      if (updated.count !== 1) throw conflict('Seller status changed in the meantime');
      await tx.sellerApproval.create({
        data: { sellerId, fromStatus: seller.status, toStatus: to, reason: reason ?? null, actorId: actor?.auth?.userId ?? null },
      });
      await this.audit.record(
        actor,
        { action: `seller.status.${to.toLowerCase()}`, entityType: 'Seller', entityId: sellerId, before: { status: seller.status }, after: { status: to, reason } },
        tx,
      );
    });
    this.auth.invalidatePrincipal(seller.userId);
    // Listings become (un)purchasable with the seller's status.
    await this.indexer.refreshForSeller(sellerId);

    const key =
      to === 'APPROVED'
        ? seller.status === 'PENDING_APPROVAL' || seller.status === 'REJECTED'
          ? 'seller.approved'
          : 'seller.reactivated'
        : to === 'REJECTED'
          ? 'seller.rejected'
          : to === 'SUSPENDED'
            ? 'seller.suspended'
            : null;
    if (key) {
      await this.notifications.notify({
        key,
        userId: seller.userId,
        vars: { businessName: seller.businessName, reason: reason ?? '' },
        link: '/seller',
      });
    }
    return this.adminDetail(sellerId);
  }

  async adminUpdate(sellerId: string, input: Partial<ProfileInput> & { businessName?: string; gstin?: string; pan?: string; isFeatured?: boolean }, actor: AuditActor) {
    const before = await this.db.seller.findFirst({ where: { id: sellerId, deletedAt: null } });
    if (!before) throw notFound('Seller');
    const updated = await this.db.seller.update({
      where: { id: sellerId },
      data: {
        businessName: input.businessName,
        displayName: input.displayName,
        description: input.description,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        fulfillmentMode: input.fulfillmentMode,
        gstin: input.gstin,
        pan: input.pan,
        isFeatured: input.isFeatured,
      },
    });
    await this.audit.record(actor, { action: 'seller.admin_update', entityType: 'Seller', entityId: sellerId, before, after: updated });
    return updated;
  }

  async verifyDocument(documentId: string, status: 'VERIFIED' | 'REJECTED', note: string | undefined, actor: AuditActor) {
    const doc = await this.db.sellerDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw notFound('Document');
    const updated = await this.db.sellerDocument.update({ where: { id: documentId }, data: { status, note: note ?? null } });
    await this.audit.record(actor, { action: `seller.document_${status.toLowerCase()}`, entityType: 'SellerDocument', entityId: documentId, metadata: { note } });
    return { ...updated, storageKey: undefined };
  }
}
