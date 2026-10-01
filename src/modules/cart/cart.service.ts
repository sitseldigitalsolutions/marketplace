import type { Prisma, PrismaClient, ShippingMethod } from '@prisma/client';
import type { Db } from '../../database/prisma/client';
import { AppError, businessRule, notFound } from '../../shared/errors';
import { fromPaise, toPaise } from '../../shared/money';
import { randomToken } from '../../shared/crypto';
import { purchasableListingWhere } from '../catalog/product-indexer';
import { thumbOf } from '../catalog/storefront.service';
import type { CouponService } from '../coupons/coupon.service';
import { price, type PricingLine, type PricingResult } from '../orders/pricing';
import type { SettingsService } from '../settings/settings.service';
import type { ShippingService } from '../shipping/shipping.service';
import type { TaxService } from '../tax/tax.service';

export const GUEST_CART_COOKIE = 'vy_cart';
export const MAX_QTY_PER_LINE = 10;

export type CartOwner = { userId: string } | { guestToken: string };

export const cartItemInclude = {
  listing: {
    include: {
      inventory: { select: { quantity: true, reserved: true } },
      seller: { select: { id: true, displayName: true, slug: true, status: true, deletedAt: true, fulfillmentMode: true } },
      variant: { select: { id: true, name: true, options: true, deletedAt: true } },
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          deletedAt: true,
          categoryId: true,
          codAvailable: true,
          isReturnable: true,
          returnWindowDays: true,
          hsnCode: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, storageKey: true } },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartItemRow = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

export interface EvaluatedLine {
  item: CartItemRow;
  purchasable: boolean;
  available: number;
  issue: string | null;
  priceChanged: boolean;
}

/** Why a cart line cannot be bought right now (null when it can). */
export function lineIssue(item: CartItemRow): { purchasable: boolean; available: number; issue: string | null } {
  const l = item.listing;
  const available = Math.max(0, (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0));
  const live =
    l.status === 'APPROVED' &&
    l.isActive &&
    !l.deletedAt &&
    l.product.status === 'APPROVED' &&
    !l.product.deletedAt &&
    l.seller.status === 'APPROVED' &&
    !l.seller.deletedAt &&
    !l.variant.deletedAt;
  if (!live) return { purchasable: false, available, issue: 'This item is no longer available' };
  if (available <= 0) return { purchasable: false, available, issue: 'Out of stock' };
  if (item.quantity > available) return { purchasable: false, available, issue: `Only ${available} left in stock` };
  return { purchasable: true, available, issue: null };
}

export class CartService {
  constructor(
    private readonly db: PrismaClient,
    private readonly coupons: CouponService,
    private readonly shipping: ShippingService,
    private readonly tax: TaxService,
    private readonly settings: SettingsService,
  ) {}

  newGuestToken() {
    return randomToken(48).slice(0, 64);
  }

  private whereOwner(owner: CartOwner) {
    return 'userId' in owner ? { userId: owner.userId } : { guestToken: owner.guestToken };
  }

  async findCart(owner: CartOwner) {
    return this.db.cart.findFirst({ where: this.whereOwner(owner) });
  }

  private async ensureCart(owner: CartOwner) {
    const existing = await this.findCart(owner);
    if (existing) return existing;
    return this.db.cart.create({ data: this.whereOwner(owner) });
  }

  async items(cartId: string, db: Db = this.db) {
    return db.cartItem.findMany({ where: { cartId }, include: cartItemInclude, orderBy: { createdAt: 'asc' } });
  }

  /** Build pricing lines (with tax rates and category lineage) for purchasable items. */
  async pricingLines(items: CartItemRow[]): Promise<{ lines: PricingLine[]; taxInclusive: boolean }> {
    const { rates, inclusive } = await this.tax.resolve(items.map((i) => i.listing.product.categoryId));
    return {
      taxInclusive: inclusive,
      lines: items.map((i) => {
        const t = rates.get(i.listing.product.categoryId)!;
        return {
          key: i.listingId,
          sellerId: i.listing.sellerId,
          productId: i.listing.productId,
          categoryIds: t.lineage,
          unitPrice: toPaise(i.listing.price),
          unitMrp: toPaise(i.listing.mrp),
          quantity: i.quantity,
          taxRate: t.rate,
        };
      }),
    };
  }

  /**
   * Price the purchasable part of the cart. Coupon problems are reported, not thrown, so the
   * cart always renders.
   */
  async quote(
    items: CartItemRow[],
    opts: { userId: string | null; couponCode?: string | null; shippingMethod?: ShippingMethod },
  ): Promise<{ pricing: PricingResult; couponError: string | null; evaluated: EvaluatedLine[] }> {
    const evaluated = items.map((item) => {
      const r = lineIssue(item);
      return { item, ...r, priceChanged: toPaise(item.priceAtAdd) !== toPaise(item.listing.price) };
    });
    const buyable = evaluated.filter((e) => e.purchasable).map((e) => e.item);
    const [{ lines, taxInclusive }, shippingRule, cod] = await Promise.all([
      this.pricingLines(buyable),
      this.shipping.rule(opts.shippingMethod ?? 'STANDARD'),
      this.settings.get('cod'),
    ]);
    let coupon = null;
    let couponError: string | null = null;
    if (opts.couponCode) {
      try {
        coupon = this.coupons.toPricing(await this.coupons.validate(opts.couponCode, opts.userId));
      } catch (err) {
        couponError = err instanceof AppError ? err.message : 'Coupon could not be applied';
      }
    }
    const pricing = price({ lines, coupon, shipping: shippingRule, taxInclusive, codFee: toPaise(cod.fee) });
    if (pricing.coupon && !pricing.coupon.applied) couponError = pricing.coupon.message;
    return { pricing, couponError, evaluated };
  }

  /** Cart view model for the storefront. */
  async view(owner: CartOwner | null) {
    const cart = owner ? await this.findCart(owner) : null;
    const items = cart ? await this.items(cart.id) : [];
    const userId = owner && 'userId' in owner ? owner.userId : null;
    const { pricing, couponError, evaluated } = await this.quote(items, { userId, couponCode: cart?.couponCode });
    return {
      id: cart?.id ?? null,
      couponCode: cart?.couponCode ?? null,
      couponError,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      items: evaluated.map((e) => this.itemView(e)),
      summary: summaryView(pricing),
      hasIssues: evaluated.some((e) => !e.purchasable),
    };
  }

  itemView(e: EvaluatedLine) {
    const l = e.item.listing;
    return {
      id: e.item.id,
      listingId: l.id,
      quantity: e.item.quantity,
      maxQuantity: Math.min(MAX_QTY_PER_LINE, e.available),
      product: {
        id: l.product.id,
        slug: l.product.slug,
        title: l.product.title,
        imageUrl: thumbOf(l.product.images[0]),
        codAvailable: l.product.codAvailable,
        isReturnable: l.product.isReturnable,
        returnWindowDays: l.product.returnWindowDays,
      },
      variant: { id: l.variant.id, name: l.variant.name, options: l.variant.options },
      seller: { id: l.seller.id, name: l.seller.displayName, slug: l.seller.slug },
      price: fromPaise(toPaise(l.price)),
      mrp: fromPaise(toPaise(l.mrp)),
      priceAtAdd: fromPaise(toPaise(e.item.priceAtAdd)),
      priceChanged: e.priceChanged,
      available: e.available,
      purchasable: e.purchasable,
      issue: e.issue,
      lineTotal: fromPaise(toPaise(l.price) * e.item.quantity),
    };
  }

  async add(owner: CartOwner, listingId: string, quantity: number) {
    const listing = await this.db.sellerProductListing.findFirst({
      where: { id: listingId, ...purchasableListingWhere },
      include: { inventory: true },
    });
    if (!listing) throw notFound('Product');
    const available = (listing.inventory?.quantity ?? 0) - (listing.inventory?.reserved ?? 0);
    if (available <= 0) throw new AppError(409, 'OUT_OF_STOCK', 'This item is out of stock');
    const cart = await this.ensureCart(owner);
    const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: cart.id, listingId } } });
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (next > available) throw new AppError(409, 'OUT_OF_STOCK', `Only ${available} unit(s) available`);
    await this.db.cartItem.upsert({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      create: { cartId: cart.id, listingId, quantity: next, priceAtAdd: listing.price },
      update: { quantity: next },
    });
    await this.db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  }

  /** Items are always looked up through the owner's own cart — never by bare ID (anti-IDOR). */
  private async ownItem(owner: CartOwner, itemId: string) {
    const cart = await this.findCart(owner);
    if (!cart) throw notFound('Cart item');
    const item = await this.db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: cartItemInclude });
    if (!item) throw notFound('Cart item');
    return item;
  }

  async update(owner: CartOwner, itemId: string, quantity: number) {
    const item = await this.ownItem(owner, itemId);
    const { available } = lineIssue(item);
    if (quantity > MAX_QTY_PER_LINE) throw businessRule(`You can buy at most ${MAX_QTY_PER_LINE} units of an item`);
    if (quantity > available) throw new AppError(409, 'OUT_OF_STOCK', `Only ${available} unit(s) available`);
    // Updating the quantity also acknowledges the current price.
    await this.db.cartItem.update({ where: { id: item.id }, data: { quantity, priceAtAdd: item.listing.price } });
  }

  async remove(owner: CartOwner, itemId: string) {
    const item = await this.ownItem(owner, itemId);
    await this.db.cartItem.delete({ where: { id: item.id } });
  }

  async acknowledgePrices(owner: CartOwner) {
    const cart = await this.findCart(owner);
    if (!cart) return;
    const items = await this.items(cart.id);
    for (const i of items) {
      if (toPaise(i.priceAtAdd) !== toPaise(i.listing.price)) {
        await this.db.cartItem.update({ where: { id: i.id }, data: { priceAtAdd: i.listing.price } });
      }
    }
  }

  async clear(owner: CartOwner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async applyCoupon(owner: CartOwner, code: string) {
    const userId = 'userId' in owner ? owner.userId : null;
    await this.coupons.validate(code, userId);
    const cart = await this.ensureCart(owner);
    await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() } });
    const view = await this.view(owner);
    if (view.couponError) {
      await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      throw businessRule(view.couponError);
    }
    return view;
  }

  async removeCoupon(owner: CartOwner) {
    const cart = await this.findCart(owner);
    if (cart) await this.db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }

  /** Merge a guest cart into the user's cart on sign-in (quantities add up, capped). */
  async mergeGuestCart(guestToken: string, userId: string) {
    const guest = await this.db.cart.findUnique({ where: { guestToken }, include: { items: true } });
    if (!guest) return;
    const userCart = await this.ensureCart({ userId });
    for (const gi of guest.items) {
      const existing = await this.db.cartItem.findUnique({ where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } } });
      const quantity = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + gi.quantity);
      await this.db.cartItem.upsert({
        where: { cartId_listingId: { cartId: userCart.id, listingId: gi.listingId } },
        create: { cartId: userCart.id, listingId: gi.listingId, quantity, priceAtAdd: gi.priceAtAdd },
        update: { quantity },
      });
    }
    if (guest.couponCode && !userCart.couponCode) {
      await this.db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await this.db.cart.delete({ where: { id: guest.id } });
  }
}

export function summaryView(p: PricingResult) {
  return {
    mrpTotal: fromPaise(p.mrpTotal),
    itemsSubtotal: fromPaise(p.itemsSubtotal),
    savingsOnMrp: fromPaise(p.savingsOnMrp),
    couponDiscount: fromPaise(p.discountTotal),
    shippingTotal: fromPaise(p.shippingTotal),
    codFee: fromPaise(p.codFee),
    taxTotal: fromPaise(p.taxTotal),
    grandTotal: fromPaise(p.grandTotal),
    totalSavings: fromPaise(p.savingsOnMrp + p.discountTotal + (p.coupon?.shippingWaived ?? 0)),
    coupon: p.coupon ? { ...p.coupon, discount: fromPaise(p.coupon.discount), shippingWaived: fromPaise(p.coupon.shippingWaived) } : null,
    groups: p.groups.map((g) => ({
      sellerId: g.sellerId,
      itemsSubtotal: fromPaise(g.itemsSubtotal),
      discount: fromPaise(g.discount),
      shipping: fromPaise(g.shipping),
      shippingWaived: g.shippingWaived,
      tax: fromPaise(g.tax),
      total: fromPaise(g.total),
    })),
  };
}
