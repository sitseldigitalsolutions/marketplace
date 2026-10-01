import { logger } from '../../shared/logger';
import type { Coupon, Prisma, PrismaClient, ShippingMethod } from '@prisma/client';
import type { PlaceOrderInput } from '@vyora/shared';
import { isUniqueViolation } from '../../database/prisma/client';
import { AppError, badRequest, businessRule, notFound } from '../../shared/errors';
import { decimal, fromPaise, toPaise } from '../../shared/money';
import { referenceNumber } from '../../shared/crypto';
import type { AuditService } from '../audit/audit.service';
import type { CartService, EvaluatedLine } from '../cart/cart.service';
import { summaryView } from '../cart/cart.service';
import type { ProductIndexer } from '../catalog/product-indexer';
import type { CouponService } from '../coupons/coupon.service';
import type { FinanceService } from '../finance/finance.service';
import type { InventoryService } from '../inventory/inventory.service';
import type { NotificationService } from '../notifications/notification.service';
import type { PaymentRegistry } from '../payments/payment-provider';
import type { SettingsService } from '../settings/settings.service';
import type { ShippingService } from '../shipping/shipping.service';
import { commissionFor, resolveCommission, type PricingResult } from './pricing';

export interface CodEligibility {
  available: boolean;
  reasons: string[];
}

export class CheckoutService {
  constructor(
    private readonly db: PrismaClient,
    private readonly cart: CartService,
    private readonly coupons: CouponService,
    private readonly inventory: InventoryService,
    private readonly shipping: ShippingService,
    private readonly finance: FinanceService,
    private readonly payments: PaymentRegistry,
    private readonly settings: SettingsService,
    private readonly indexer: ProductIndexer,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  /** COD eligibility rules: global switch, order value limits, restricted categories/products, PIN code. */
  async codEligibility(pricing: PricingResult, evaluated: EvaluatedLine[], pincode: string | null): Promise<CodEligibility> {
    const cod = await this.settings.get('cod');
    const reasons: string[] = [];
    if (!cod.enabled) reasons.push('Cash on Delivery is currently unavailable');
    const total = fromPaise(pricing.grandTotal);
    if (cod.maxOrderValue && total > cod.maxOrderValue) reasons.push(`Cash on Delivery is available for orders up to ₹${cod.maxOrderValue}`);
    if (cod.minOrderValue && total < cod.minOrderValue) reasons.push(`Cash on Delivery needs a minimum order of ₹${cod.minOrderValue}`);
    const buyable = evaluated.filter((e) => e.purchasable);
    const blocked = buyable.filter((e) => !e.item.listing.product.codAvailable);
    if (blocked.length) reasons.push(`${blocked.map((b) => b.item.listing.product.title).join(', ')} cannot be paid by cash on delivery`);
    if (cod.restrictedCategoryIds.length) {
      const restricted = buyable.filter((e) => cod.restrictedCategoryIds.includes(e.item.listing.product.categoryId));
      if (restricted.length) reasons.push('Some items belong to categories that require prepaid payment');
    }
    if (pincode) {
      const check = await this.shipping.checkPincode(pincode);
      if (!check.serviceable) reasons.push(`We do not deliver to PIN code ${pincode} yet`);
      else if (!check.codAvailable) reasons.push(`Cash on Delivery is not available for PIN code ${pincode}`);
    }
    return { available: reasons.length === 0, reasons };
  }

  private async ownAddress(userId: string, addressId: string) {
    const address = await this.db.customerAddress.findFirst({ where: { id: addressId, userId, deletedAt: null } });
    if (!address) throw notFound('Address');
    return address;
  }

  /** Checkout summary for the review step. Everything is recomputed server-side. */
  async quote(userId: string, input: { addressId?: string; pincode?: string; shippingMethod: ShippingMethod; couponCode?: string }) {
    const cart = await this.cart.findCart({ userId });
    const items = cart ? await this.cart.items(cart.id) : [];
    const address = input.addressId ? await this.ownAddress(userId, input.addressId) : null;
    const pincode = address?.pincode ?? input.pincode ?? null;
    const couponCode = input.couponCode ?? cart?.couponCode ?? null;
    const { pricing, couponError, evaluated } = await this.cart.quote(items, {
      userId,
      couponCode,
      shippingMethod: input.shippingMethod,
    });
    const [cod, delivery, methods] = await Promise.all([
      this.codEligibility(pricing, evaluated, pincode),
      pincode ? this.shipping.checkPincode(pincode, input.shippingMethod) : Promise.resolve(null),
      this.shipping.methods(),
    ]);
    return {
      items: evaluated.map((e) => this.cart.itemView(e)),
      summary: summaryView(pricing),
      couponCode,
      couponError,
      hasIssues: evaluated.some((e) => !e.purchasable) || items.length === 0,
      priceChanged: evaluated.some((e) => e.priceChanged),
      delivery,
      shippingMethods: methods.filter((m) => m.isActive),
      paymentMethods: this.payments.methods().map((m) => ({
        ...m,
        available: m.method === 'COD' ? cod.available : false,
        reasons: m.method === 'COD' ? cod.reasons : [],
      })),
    };
  }

  /**
   * Place an order. Guarantees:
   *  • idempotent per (customer, idempotencyKey) — retries return the original order;
   *  • all prices, discounts, shipping and taxes are recomputed from the database;
   *  • stock is reserved atomically; any shortfall rolls the whole order back;
   *  • coupon redemption is claimed atomically against its usage limit.
   */
  async placeOrder(userId: string, input: PlaceOrderInput, meta: { ip: string; userAgent: string | null }) {
    const existing = await this.db.order.findUnique({
      where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
      select: { id: true, orderNumber: true },
    });
    if (existing) return { ...existing, duplicate: true };

    const [user, address] = await Promise.all([
      this.db.user.findUniqueOrThrow({ where: { id: userId } }),
      this.ownAddress(userId, input.addressId),
    ]);
    if (user.status !== 'ACTIVE') throw businessRule('Your account cannot place orders right now');
    const provider = this.payments.get(input.paymentMethod);

    try {
      const result = await this.db.$transaction(
        async (tx) => {
          // Serialise concurrent checkouts of the same customer (idempotency + per-customer coupon limits).
          await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;
          const again = await tx.order.findUnique({
            where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
            select: { id: true, orderNumber: true },
          });
          if (again) return { ...again, duplicate: true, created: null };

          const cart = await tx.cart.findUnique({ where: { userId } });
          const items = cart ? await this.cart.items(cart.id, tx) : [];
          if (!items.length) throw businessRule('Your cart is empty');

          const couponCode = input.couponCode ?? cart?.couponCode ?? null;
          let coupon: Coupon | null = null;
          if (couponCode) coupon = await this.coupons.validate(couponCode, userId, tx);

          const { pricing, evaluated } = await this.cart.quote(items, {
            userId,
            couponCode: coupon?.code ?? null,
            shippingMethod: input.shippingMethod,
          });
          const problems = evaluated.filter((e) => !e.purchasable);
          if (problems.length) {
            throw new AppError(
              409,
              'OUT_OF_STOCK',
              'Some items in your cart are unavailable. Please review your cart.',
              problems.map((p) => ({ itemId: p.item.id, listingId: p.item.listingId, issue: p.issue })),
            );
          }
          if (coupon && !pricing.coupon?.applied) throw businessRule(pricing.coupon?.message ?? 'Coupon cannot be applied');

          // Price-change guard: the customer must confirm the new total before we charge it.
          const changed = evaluated.filter((e) => e.priceChanged);
          const expected = input.expectedGrandTotal !== undefined ? toPaise(input.expectedGrandTotal) : null;
          if ((expected !== null && expected !== pricing.grandTotal) || (expected === null && changed.length)) {
            throw new AppError(409, 'PRICE_CHANGED', 'Prices changed since you added these items. Please review the updated total.', [
              { grandTotal: fromPaise(pricing.grandTotal), items: changed.map((c) => c.item.id) },
            ]);
          }

          const cod = await this.codEligibility(pricing, evaluated, address.pincode);
          if (input.paymentMethod === 'COD' && !cod.available) throw businessRule(cod.reasons[0] ?? 'Cash on Delivery is unavailable');
          const delivery = await this.shipping.checkPincode(address.pincode, input.shippingMethod);
          if (!delivery.serviceable) throw businessRule(`We do not deliver to PIN code ${address.pincode} yet`);

          // Reserve stock first — a shortfall aborts before anything is written.
          const orderNumber = referenceNumber('VY');
          for (const e of evaluated) {
            await this.inventory.reserve(tx, e.item.listingId, e.item.quantity, {
              referenceType: 'ORDER',
              referenceId: orderNumber,
              reason: `Reserved for order ${orderNumber}`,
              actorId: userId,
            });
          }

          const [rules, commissionSettings, orderSettings, taxSettings] = await Promise.all([
            this.finance.activeRules(tx),
            this.settings.get('commission'),
            this.settings.get('orders'),
            this.settings.get('tax'),
          ]);
          const itemByListing = new Map(evaluated.map((e) => [e.item.listingId, e.item]));
          const initialStatus = orderSettings.autoConfirm ? 'CONFIRMED' : 'PENDING_CONFIRMATION';

          const order = await tx.order.create({
            data: {
              orderNumber,
              customerId: userId,
              idempotencyKey: input.idempotencyKey,
              status: initialStatus,
              paymentMethod: input.paymentMethod,
              paymentStatus: 'COD_PENDING',
              shippingMethod: input.shippingMethod,
              itemsSubtotal: decimal(pricing.itemsSubtotal),
              mrpTotal: decimal(pricing.mrpTotal),
              discountTotal: decimal(pricing.discountTotal),
              shippingTotal: decimal(pricing.shippingTotal),
              codFee: decimal(pricing.codFee),
              taxTotal: decimal(pricing.taxTotal),
              grandTotal: decimal(pricing.grandTotal),
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              shipName: address.fullName,
              shipPhone: address.phone,
              shipLine1: address.line1,
              shipLine2: address.line2,
              shipLandmark: address.landmark,
              shipCity: address.city,
              shipState: address.state,
              shipPincode: address.pincode,
              notes: input.notes ?? null,
            },
          });

          const createdSellerOrders: Array<{ id: string; sellerId: string; subOrderNumber: string; total: number; itemCount: number }> = [];
          for (const [gi, group] of pricing.groups.entries()) {
            const first = itemByListing.get(group.lines[0].key)!;
            let commissionTotal = 0;
            const subOrderNumber = `${orderNumber}-${gi + 1}`;
            const so = await tx.sellerOrder.create({
              data: {
                subOrderNumber,
                orderId: order.id,
                sellerId: group.sellerId,
                status: initialStatus,
                fulfillmentMode: first.listing.seller.fulfillmentMode,
                itemsSubtotal: decimal(group.itemsSubtotal),
                discountTotal: decimal(group.discount),
                shippingTotal: decimal(group.shipping),
                taxTotal: decimal(group.tax),
                grandTotal: decimal(group.total),
                confirmedAt: orderSettings.autoConfirm ? new Date() : null,
              },
            });
            for (const line of group.lines) {
              const item = itemByListing.get(line.key)!;
              const rule = resolveCommission(
                rules,
                { sellerId: line.sellerId, productId: line.productId, categoryLineage: line.categoryIds },
                this.finance.defaultCommissionPercent,
              );
              const c = commissionFor(line, rule, commissionSettings.taxRate);
              commissionTotal += c.commission;
              const oi = await tx.orderItem.create({
                data: {
                  orderId: order.id,
                  sellerOrderId: so.id,
                  sellerId: line.sellerId,
                  listingId: item.listingId,
                  productId: item.listing.productId,
                  variantId: item.listing.variantId,
                  categoryId: item.listing.product.categoryId,
                  productName: item.listing.product.title,
                  variantName: item.listing.variant.name === 'Default' ? null : item.listing.variant.name,
                  sku: item.listing.sku,
                  sellerName: item.listing.seller.displayName,
                  imageUrl: item.listing.product.images[0]?.url ?? null,
                  hsnCode: item.listing.product.hsnCode,
                  unitPrice: decimal(line.unitPrice),
                  unitMrp: decimal(line.unitMrp),
                  quantity: line.quantity,
                  lineSubtotal: decimal(line.lineSubtotal),
                  discountAmount: decimal(line.discount),
                  sellerFundedDiscount: decimal(line.sellerFundedDiscount),
                  shippingAmount: decimal(line.shipping),
                  taxRate: line.taxRate,
                  taxAmount: decimal(line.tax),
                  taxInclusive: taxSettings.pricesInclusive,
                  lineTotal: decimal(line.total),
                  commissionRate: rule.percentage,
                  commissionFixed: decimal(rule.fixedPerUnit),
                  commissionAmount: decimal(c.commission),
                  status: initialStatus,
                  isReturnable: item.listing.product.isReturnable,
                  returnWindowDays: item.listing.product.returnWindowDays,
                },
              });
              await tx.commission.create({
                data: {
                  orderItemId: oi.id,
                  sellerId: line.sellerId,
                  baseAmount: decimal(c.base),
                  rate: rule.percentage,
                  fixedAmount: decimal(rule.fixedPerUnit * line.quantity),
                  amount: decimal(c.commission),
                  taxRate: commissionSettings.taxRate,
                  taxAmount: decimal(c.commissionTax),
                  ruleId: rule.ruleId,
                  ruleScope: rule.scope,
                },
              });
              await tx.product.update({ where: { id: item.listing.productId }, data: { soldCount: { increment: line.quantity } } });
            }
            await tx.sellerOrder.update({ where: { id: so.id }, data: { commissionTotal: decimal(commissionTotal) } });
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, sellerOrderId: so.id, toStatus: initialStatus, actorId: userId, actorRole: 'CUSTOMER', note: 'Order placed' },
            });
            createdSellerOrders.push({
              id: so.id,
              sellerId: group.sellerId,
              subOrderNumber,
              total: fromPaise(group.total),
              itemCount: group.lines.reduce((s, l) => s + l.quantity, 0),
            });
          }

          const payment = await provider.createPayment({
            orderId: order.id,
            orderNumber,
            amount: pricing.grandTotal,
            currency: 'INR',
            customer: { id: user.id, email: user.email, phone: user.phone, name: user.name },
          });
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: provider.code,
              method: input.paymentMethod,
              amount: decimal(pricing.grandTotal),
              status: payment.status,
              providerRef: payment.providerRef ?? null,
            },
          });
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: payment.status } });
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, toStatus: initialStatus, actorId: userId, actorRole: 'CUSTOMER', note: `Order placed · ${provider.label}` },
          });
          if (coupon) await this.coupons.redeem(tx, coupon, userId, order.id, pricing.discountTotal + (pricing.coupon?.shippingWaived ?? 0));

          // Only the purchased lines leave the cart.
          await tx.cartItem.deleteMany({ where: { id: { in: evaluated.map((e) => e.item.id) } } });
          if (cart) await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

          await this.audit.record(
            { auth: null, ip: meta.ip, userAgent: meta.userAgent },
            {
              action: 'order.place',
              entityType: 'Order',
              entityId: order.id,
              after: { orderNumber, grandTotal: fromPaise(pricing.grandTotal), sellers: createdSellerOrders.length },
            },
            tx,
          );
          return {
            id: order.id,
            orderNumber,
            duplicate: false,
            created: { sellerOrders: createdSellerOrders, grandTotal: fromPaise(pricing.grandTotal), listingIds: evaluated.map((e) => e.item.listingId), productIds: evaluated.map((e) => e.item.listing.productId) },
          };
        },
        { maxWait: 10_000, timeout: 30_000 },
      );

      if (result.created) {
        const c = result.created;
        await this.notifications.notify({
          key: 'order.placed',
          userId,
          link: `/account/orders/${result.id}`,
          vars: { orderNumber: result.orderNumber, amount: `₹${c.grandTotal.toFixed(2)}` },
        });
        const sellers = await this.db.seller.findMany({ where: { id: { in: c.sellerOrders.map((s) => s.sellerId) } }, select: { id: true, userId: true } });
        for (const so of c.sellerOrders) {
          await this.notifications.notify({
            key: 'order.new_for_seller',
            userId: sellers.find((s) => s.id === so.sellerId)!.userId,
            link: `/seller/orders/${so.id}`,
            vars: { subOrderNumber: so.subOrderNumber, itemCount: so.itemCount, amount: `₹${so.total.toFixed(2)}` },
          });
        }
        await this.indexer.refresh(c.productIds);
        await this.inventory.checkLowStock(c.listingIds).catch((err) => logger.error({ err }, 'low-stock check failed'));
      }
      return { id: result.id, orderNumber: result.orderNumber, duplicate: result.duplicate };
    } catch (err) {
      // A concurrent request with the same key won the race.
      if (isUniqueViolation(err, 'idempotencyKey')) {
        const winner = await this.db.order.findUnique({
          where: { customerId_idempotencyKey: { customerId: userId, idempotencyKey: input.idempotencyKey } },
          select: { id: true, orderNumber: true },
        });
        if (winner) return { ...winner, duplicate: true };
      }
      if (err instanceof AppError) throw err;
      if (isUniqueViolation(err)) throw badRequest('Please try placing the order again');
      throw err;
    }
  }
}

export type { Prisma };
