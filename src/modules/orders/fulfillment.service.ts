import type { OrderItem, OrderStatus, Prisma, PrismaClient } from '@prisma/client';
import { canTransition, CUSTOMER_CANCELLABLE, deriveParentStatus, ORDER_STATUS_LABELS } from '@vyora/shared';
import type { Db } from '../../database/prisma/client';
import { badRequest, businessRule, conflict, forbidden, notFound } from '../../shared/errors';
import { decimal, fromPaise, toPaise } from '../../shared/money';
import { referenceNumber } from '../../shared/crypto';
import type { AuditActor, AuditService } from '../audit/audit.service';
import { primaryRole } from '../audit/audit.service';
import type { ProductIndexer } from '../catalog/product-indexer';
import type { CouponService } from '../coupons/coupon.service';
import type { FinanceService, LedgerEntryInput } from '../finance/finance.service';
import type { InventoryService } from '../inventory/inventory.service';
import type { NotificationService } from '../notifications/notification.service';
import type { SettingsService } from '../settings/settings.service';
import type { ShippingService } from '../shipping/shipping.service';
import { prorate } from './pricing';

export type OrderScope = { kind: 'seller'; sellerId: string } | { kind: 'admin' } | { kind: 'customer'; userId: string };

const PRE_SHIPMENT: OrderStatus[] = ['PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING'];

const activeQty = (i: Pick<OrderItem, 'quantity' | 'cancelledQuantity'>) => i.quantity - i.cancelledQuantity;

/**
 * Post-placement order lifecycle: seller fulfillment, cancellations, COD collection,
 * returns and refunds. Every money-affecting step is item-level and pro-rated so partial
 * cancellations/returns stay consistent with commissions and the seller ledger.
 */
export class FulfillmentService {
  constructor(
    private readonly db: PrismaClient,
    private readonly inventory: InventoryService,
    private readonly finance: FinanceService,
    private readonly coupons: CouponService,
    private readonly shipping: ShippingService,
    private readonly settings: SettingsService,
    private readonly indexer: ProductIndexer,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private actorRole(actor: AuditActor) {
    return primaryRole(actor?.auth ?? null);
  }

  /** Load a sub-order the caller may act on. Other sellers' sub-orders are reported as not found. */
  private async loadSellerOrder(tx: Db, sellerOrderId: string, scope: OrderScope) {
    const so = await tx.sellerOrder.findFirst({
      where: {
        id: sellerOrderId,
        ...(scope.kind === 'seller' ? { sellerId: scope.sellerId } : {}),
        ...(scope.kind === 'customer' ? { order: { customerId: scope.userId } } : {}),
      },
      include: { items: true, order: true, seller: { select: { id: true, status: true, userId: true, displayName: true } } },
    });
    if (!so) throw notFound('Order');
    return so;
  }

  /** Recompute the parent order status and payment amount after any sub-order change. */
  private async syncParent(tx: Db, orderId: string, actor: AuditActor, note?: string) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { sellerOrders: true, items: true, payments: true } });
    const next = deriveParentStatus(order.sellerOrders.map((s) => s.status));
    const allCancelled = next === 'CANCELLED';
    const allDelivered = order.sellerOrders.filter((s) => s.status !== 'CANCELLED').every((s) => s.status === 'DELIVERED');

    // Amount the customer still owes = Σ active share of each line (+ COD fee unless fully cancelled).
    const due =
      order.items.reduce((s, i) => s + prorate(toPaise(i.lineTotal), activeQty(i), i.quantity), 0) +
      (allCancelled ? 0 : toPaise(order.codFee));
    const payment = order.payments[0];
    if (payment) {
      const collected = toPaise(payment.collected);
      const status = allCancelled && collected === 0 ? 'FAILED' : payment.status;
      await tx.payment.update({ where: { id: payment.id }, data: { amount: decimal(due), status } });
      if (status !== order.paymentStatus) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    }
    if (next !== order.status) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: next,
          cancelledAt: allCancelled ? new Date() : undefined,
          deliveredAt: allDelivered && next === 'DELIVERED' ? new Date() : undefined,
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: next, note: note ?? null, actorId: actor?.auth?.userId ?? null, actorRole: this.actorRole(actor) },
      });
    }
    if (allCancelled) await this.coupons.release(tx, orderId);
    return next;
  }

  /** Cancel `qty` units of each given item (pre-shipment only). Releases stock and reverses commission. */
  private async cancelItems(tx: Db, items: Array<{ item: OrderItem; qty: number }>, reason: string, actor: AuditActor) {
    for (const { item, qty } of items) {
      if (qty <= 0) continue;
      if (item.listingId) {
        await this.inventory.release(tx, item.listingId, qty, {
          referenceType: 'ORDER_ITEM',
          referenceId: item.id,
          reason: `Cancelled: ${reason}`,
          actorId: actor?.auth?.userId,
        });
      }
      const cancelledQuantity = item.cancelledQuantity + qty;
      const full = cancelledQuantity >= item.quantity;
      await tx.orderItem.update({
        where: { id: item.id },
        data: { cancelledQuantity, status: full ? 'CANCELLED' : undefined },
      });
      if (full) await tx.commission.updateMany({ where: { orderItemId: item.id }, data: { status: 'REVERSED' } });
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { soldCount: { decrement: qty } } });
    }
  }

  // ── Seller / admin fulfillment ─────────────────────────────
  async updateSellerOrderStatus(
    sellerOrderId: string,
    to: 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED',
    input: { note?: string; carrier?: string; trackingNumber?: string; trackingUrl?: string },
    scope: OrderScope,
    actor: AuditActor,
  ) {
    if (scope.kind === 'customer') throw forbidden();
    const result = await this.db.$transaction(async (tx) => {
      const so = await this.loadSellerOrder(tx, sellerOrderId, scope);
      if (!canTransition(so.status, to)) {
        throw businessRule(`An order that is ${ORDER_STATUS_LABELS[so.status].toLowerCase()} cannot be marked ${ORDER_STATUS_LABELS[to].toLowerCase()}`);
      }
      if (scope.kind === 'seller' && to !== 'CANCELLED') {
        const sellersSettings = await this.settings.get('sellers');
        if (so.seller.status !== 'APPROVED') {
          if (to === 'CONFIRMED') throw forbidden('Your seller account cannot accept new orders while it is not active');
          if (!(so.seller.status === 'SUSPENDED' && sellersSettings.suspendedCanFulfillExisting)) {
            throw forbidden('Your seller account cannot process orders right now');
          }
        }
      }
      if (to === 'SHIPPED' && !input.trackingNumber && so.fulfillmentMode === 'SELLER') {
        throw badRequest('Enter the carrier and tracking number to mark the order as shipped');
      }
      // Optimistic concurrency: the status must not have changed since we read it.
      const moved = await tx.sellerOrder.updateMany({
        where: { id: so.id, status: so.status },
        data: {
          status: to,
          ...(to === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
          ...(to === 'SHIPPED' ? { shippedAt: new Date() } : {}),
          ...(to === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          ...(to === 'CANCELLED' ? { cancelledAt: new Date(), cancelReason: input.note ?? 'Cancelled by seller' } : {}),
        },
      });
      if (moved.count !== 1) throw conflict('This order was updated by someone else. Refresh and try again.');

      const active = so.items.filter((i) => activeQty(i) > 0);
      if (to === 'CANCELLED') {
        await this.cancelItems(tx, active.map((item) => ({ item, qty: activeQty(item) })), input.note ?? 'Rejected by seller', actor);
      } else {
        await tx.orderItem.updateMany({ where: { id: { in: active.map((i) => i.id) } }, data: { status: to } });
      }

      if (to === 'SHIPPED') {
        for (const item of active) {
          if (item.listingId) {
            await this.inventory.consume(tx, item.listingId, activeQty(item), {
              referenceType: 'ORDER_ITEM',
              referenceId: item.id,
              reason: `Shipped in ${so.subOrderNumber}`,
              actorId: actor?.auth?.userId,
            });
          }
        }
        const rule = await this.shipping.rule(so.order.shippingMethod).catch(() => null);
        const day = 86400_000;
        await tx.shipment.create({
          data: {
            sellerOrderId: so.id,
            carrier: input.carrier ?? (so.fulfillmentMode === 'PLATFORM' ? 'Vyora Logistics' : null),
            trackingNumber: input.trackingNumber ?? null,
            trackingUrl: input.trackingUrl ?? null,
            status: 'SHIPPED',
            shippedAt: new Date(),
            estimatedFrom: rule ? new Date(Date.now() + rule.minDays * day) : null,
            estimatedTo: rule ? new Date(Date.now() + rule.maxDays * day) : null,
            items: { create: active.map((i) => ({ orderItemId: i.id, quantity: activeQty(i) })) },
            events: { create: { status: 'SHIPPED', note: input.note ?? 'Handed over to carrier' } },
          },
        });
      }
      if (to === 'OUT_FOR_DELIVERY' || to === 'DELIVERED') {
        const shipment = await tx.shipment.findFirst({ where: { sellerOrderId: so.id }, orderBy: { createdAt: 'desc' } });
        if (shipment) {
          await tx.shipment.update({
            where: { id: shipment.id },
            data: { status: to, ...(to === 'DELIVERED' ? { deliveredAt: new Date() } : {}) },
          });
          await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, status: to, note: input.note ?? null } });
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: so.orderId,
          sellerOrderId: so.id,
          fromStatus: so.status,
          toStatus: to,
          note: input.note ?? null,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor),
        },
      });
      await this.syncParent(tx, so.orderId, actor);
      await this.audit.record(
        actor,
        {
          action: `order.fulfillment.${to.toLowerCase()}`,
          entityType: 'SellerOrder',
          entityId: so.id,
          before: { status: so.status },
          after: { status: to, ...input },
        },
        tx,
      );
      return so;
    });

    const productIds = result.items.map((i) => i.productId).filter(Boolean) as string[];
    await this.indexer.refresh(productIds);
    const key = to === 'SHIPPED' ? 'order.shipped' : to === 'DELIVERED' ? 'order.delivered' : to === 'CANCELLED' ? 'order.cancelled' : 'order.status_changed';
    await this.notifications.notify({
      key,
      userId: result.order.customerId,
      link: `/account/orders/${result.orderId}`,
      vars: {
        orderNumber: result.order.orderNumber,
        sellerName: result.seller.displayName,
        status: ORDER_STATUS_LABELS[to].toLowerCase(),
        note: input.note ?? '',
        reason: input.note ?? 'The seller could not fulfil these items',
        carrier: input.carrier ?? 'our delivery partner',
        trackingNumber: input.trackingNumber ?? '—',
      },
    });
    return { id: result.id, status: to };
  }

  // ── Customer cancellation ──────────────────────────────────
  async cancelByCustomer(userId: string, orderId: string, input: { reason: string; orderItemIds?: string[] }, actor: AuditActor) {
    const affected = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: { sellerOrders: { include: { items: true, seller: { select: { userId: true } } } } },
      });
      if (!order) throw notFound('Order');
      const requested = input.orderItemIds?.length ? new Set(input.orderItemIds) : null;
      const touched: typeof order.sellerOrders = [];
      for (const so of order.sellerOrders) {
        const items = so.items.filter((i) => activeQty(i) > 0 && (!requested || requested.has(i.id)));
        if (!items.length) continue;
        if (!CUSTOMER_CANCELLABLE.includes(so.status)) {
          if (requested) throw businessRule(`Items from ${so.items[0]?.sellerName ?? 'this seller'} have already shipped and can no longer be cancelled`);
          continue;
        }
        await this.cancelItems(tx, items.map((item) => ({ item, qty: activeQty(item) })), input.reason, actor);
        const remaining = await tx.orderItem.count({ where: { sellerOrderId: so.id, status: { not: 'CANCELLED' } } });
        if (remaining === 0) {
          await tx.sellerOrder.update({
            where: { id: so.id },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: `Customer: ${input.reason}` },
          });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId: so.id,
            fromStatus: so.status,
            toStatus: remaining === 0 ? 'CANCELLED' : so.status,
            note: `Cancelled by customer (${items.length} item${items.length > 1 ? 's' : ''}): ${input.reason}`,
            actorId: userId,
            actorRole: 'CUSTOMER',
          },
        });
        touched.push(so);
      }
      if (requested) {
        const known = new Set(order.sellerOrders.flatMap((s) => s.items.map((i) => i.id)));
        if ([...requested].some((id) => !known.has(id))) throw notFound('Order item');
      }
      if (!touched.length) throw businessRule('Nothing in this order can be cancelled anymore');
      await this.syncParent(tx, orderId, actor, 'Cancelled by customer');
      await this.audit.record(actor, { action: 'order.cancel', entityType: 'Order', entityId: orderId, after: input }, tx);
      return { order, touched };
    });

    await this.indexer.refresh(affected.touched.flatMap((s) => s.items.map((i) => i.productId)).filter(Boolean) as string[]);
    await this.notifications.notify({
      key: 'order.cancelled',
      userId,
      link: `/account/orders/${orderId}`,
      vars: { orderNumber: affected.order.orderNumber, reason: input.reason },
    });
    for (const so of affected.touched) {
      await this.notifications.notify({
        key: 'order.cancelled_seller',
        userId: so.seller.userId,
        link: `/seller/orders/${so.id}`,
        vars: { subOrderNumber: so.subOrderNumber, reason: input.reason },
      });
    }
  }

  /** Admin cancellation of a sub-order before shipment (e.g. fraud, unreachable customer). */
  async cancelByAdmin(sellerOrderId: string, reason: string, actor: AuditActor) {
    return this.updateSellerOrderStatus(sellerOrderId, 'CANCELLED', { note: reason }, { kind: 'admin' }, actor);
  }

  // ── COD collection & seller earnings ───────────────────────
  /**
   * Confirm that cash for a delivered sub-order has been received (courier remittance).
   * Only now does the seller earn: sale credit, commission and commission-tax debits and
   * (for seller-fulfilled orders) the shipping fee are posted to the seller ledger.
   */
  async confirmCodCollection(sellerOrderId: string, input: { reference?: string }, actor: AuditActor) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`SellerOrder\` WHERE id = ${sellerOrderId} FOR UPDATE`;
      const so = await tx.sellerOrder.findUnique({
        where: { id: sellerOrderId },
        include: { items: { include: { commission: true } }, order: { include: { payments: true, sellerOrders: true } } },
      });
      if (!so) throw notFound('Order');
      if (so.status !== 'DELIVERED') throw businessRule('Cash can only be confirmed for delivered orders');
      if (so.codCollected) throw conflict('Cash collection was already confirmed for this order');
      const payment = so.order.payments[0];
      if (!payment || payment.method !== 'COD') throw businessRule('This order is not a Cash on Delivery order');

      const entries: LedgerEntryInput[] = [];
      let collected = 0;
      for (const item of so.items) {
        const qty = activeQty(item);
        if (qty <= 0) continue;
        collected += prorate(toPaise(item.lineTotal), qty, item.quantity);
        // Earnings exclude units already returned before collection was reconciled.
        const earnQty = qty - item.returnedQuantity;
        if (earnQty <= 0) continue;
        const base = prorate(toPaise(item.lineSubtotal) - toPaise(item.sellerFundedDiscount), earnQty, item.quantity);
        const commission = prorate(toPaise(item.commissionAmount), earnQty, item.quantity);
        const commissionTax = prorate(toPaise(item.commission?.taxAmount ?? 0), earnQty, item.quantity);
        const common = { sellerId: so.sellerId, orderId: so.orderId, sellerOrderId: so.id, orderItemId: item.id, actorId: actor?.auth?.userId };
        entries.push(
          { ...common, type: 'SALE_CREDIT', amount: base, description: `Sale ${so.subOrderNumber} · ${item.productName} × ${earnQty}` },
          { ...common, type: 'COMMISSION_DEBIT', amount: -commission, description: `Commission ${Number(item.commissionRate)}% · ${so.subOrderNumber}` },
          { ...common, type: 'COMMISSION_TAX_DEBIT', amount: -commissionTax, description: `GST on commission · ${so.subOrderNumber}` },
        );
        if (so.fulfillmentMode === 'SELLER') {
          entries.push({
            ...common,
            type: 'SHIPPING_CREDIT',
            amount: prorate(toPaise(item.shippingAmount), earnQty, item.quantity),
            description: `Shipping fee · ${so.subOrderNumber}`,
          });
        }
        if (item.commission) await tx.commission.update({ where: { id: item.commission.id }, data: { status: 'EARNED' } });
      }
      await this.finance.post(tx, entries);
      await tx.sellerOrder.update({ where: { id: so.id }, data: { codCollected: true, codCollectedAt: new Date() } });

      // The COD fee is collected together with the last sub-order of the order.
      const others = so.order.sellerOrders.filter((s) => s.id !== so.id && s.status !== 'CANCELLED');
      const isLast = others.every((s) => s.codCollected);
      const newCollected = toPaise(payment.collected) + collected + (isLast ? toPaise(so.order.codFee) : 0);
      const paid = isLast;
      const hasPendingRefunds = (await tx.refund.count({ where: { orderId: so.orderId, status: 'PENDING' } })) > 0;
      const status = paid ? (hasPendingRefunds ? 'REFUND_PENDING' : 'PAID') : 'COD_PENDING';
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          collected: decimal(newCollected),
          status,
          paidAt: paid ? new Date() : undefined,
          providerRef: input.reference ?? payment.providerRef,
        },
      });
      await tx.order.update({ where: { id: so.orderId }, data: { paymentStatus: status } });
      await this.audit.record(
        actor,
        {
          action: 'payment.cod_collected',
          entityType: 'SellerOrder',
          entityId: so.id,
          after: { collected: fromPaise(collected), reference: input.reference, ledgerEntries: entries.length },
        },
        tx,
      );
    });
  }

  // ── Returns ────────────────────────────────────────────────
  async requestReturn(
    userId: string,
    orderId: string,
    input: { reason: string; comments?: string; items: Array<{ orderItemId: string; quantity: number }> },
    actor: AuditActor,
  ) {
    const returnsSettings = await this.settings.get('returns');
    if (!returnsSettings.enabled) throw businessRule('Returns are currently not accepted');
    const created = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} AND customerId = ${userId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: userId },
        include: {
          items: { include: { returnItems: { include: { returnRequest: { select: { status: true } } } }, sellerOrder: true } },
        },
      });
      if (!order) throw notFound('Order');
      const bySellerOrder = new Map<string, Array<{ item: (typeof order.items)[number]; qty: number }>>();
      for (const req of input.items) {
        const item = order.items.find((i) => i.id === req.orderItemId);
        if (!item) throw notFound('Order item');
        if (item.sellerOrder.status !== 'DELIVERED' || !item.sellerOrder.deliveredAt) throw businessRule(`"${item.productName}" has not been delivered yet`);
        if (!item.isReturnable) throw businessRule(`"${item.productName}" is not eligible for return`);
        const deadline = item.sellerOrder.deliveredAt.getTime() + item.returnWindowDays * 86400_000;
        if (Date.now() > deadline) throw businessRule(`The return window for "${item.productName}" has closed`);
        const inFlight = item.returnItems
          .filter((r) => !['REJECTED', 'CANCELLED'].includes(r.returnRequest.status))
          .reduce((s, r) => s + r.quantity, 0);
        const returnable = activeQty(item) - inFlight;
        if (req.quantity > returnable) throw businessRule(`You can return at most ${Math.max(0, returnable)} unit(s) of "${item.productName}"`);
        if (!bySellerOrder.has(item.sellerOrderId)) bySellerOrder.set(item.sellerOrderId, []);
        bySellerOrder.get(item.sellerOrderId)!.push({ item, qty: req.quantity });
      }
      const requests = [];
      for (const [sellerOrderId, lines] of bySellerOrder) {
        const refundFor = (l: { item: OrderItem; qty: number }) =>
          prorate(toPaise(l.item.lineTotal) - toPaise(l.item.shippingAmount), l.qty, l.item.quantity);
        const total = lines.reduce((s, l) => s + refundFor(l), 0);
        const rr = await tx.returnRequest.create({
          data: {
            returnNumber: referenceNumber('RT'),
            orderId,
            sellerOrderId,
            customerId: userId,
            reason: input.reason,
            comments: input.comments ?? null,
            refundAmount: decimal(total),
            items: {
              create: lines.map((l) => ({ orderItemId: l.item.id, quantity: l.qty, refundAmount: decimal(refundFor(l)) })),
            },
          },
          include: { sellerOrder: { include: { seller: { select: { userId: true } } } } },
        });
        await tx.orderItem.updateMany({ where: { id: { in: lines.map((l) => l.item.id) } }, data: { status: 'RETURN_REQUESTED' } });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            sellerOrderId,
            fromStatus: 'DELIVERED',
            toStatus: 'RETURN_REQUESTED',
            note: `Return ${rr.returnNumber}: ${input.reason}`,
            actorId: userId,
            actorRole: 'CUSTOMER',
          },
        });
        requests.push(rr);
      }
      await this.audit.record(actor, { action: 'return.request', entityType: 'Order', entityId: orderId, after: input }, tx);
      return requests;
    });
    for (const rr of created) {
      await this.notifications.notify({
        key: 'return.requested',
        userId: rr.sellerOrder.seller.userId,
        link: `/seller/returns`,
        vars: { subOrderNumber: rr.sellerOrder.subOrderNumber, returnNumber: rr.returnNumber, reason: rr.reason },
      });
    }
    return created.map((r) => ({ id: r.id, returnNumber: r.returnNumber, refundAmount: Number(r.refundAmount) }));
  }

  async decideReturn(
    returnId: string,
    input: { decision: 'APPROVE' | 'REJECT' | 'MARK_RECEIVED'; note?: string; restock: boolean },
    scope: OrderScope,
    actor: AuditActor,
  ) {
    if (scope.kind === 'customer') throw forbidden();
    const rr = await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({
        where: { id: returnId, ...(scope.kind === 'seller' ? { sellerOrder: { sellerId: scope.sellerId } } : {}) },
        include: { items: { include: { orderItem: { include: { commission: true } } } }, sellerOrder: true, order: { include: { payments: true } } },
      });
      if (!r) throw notFound('Return request');
      const itemIds = r.items.map((i) => i.orderItemId);

      if (input.decision === 'APPROVE' || input.decision === 'REJECT') {
        if (r.status !== 'REQUESTED') throw businessRule('This return has already been reviewed');
        const status = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: 'REQUESTED' },
          data: { status, decisionNote: input.note ?? null, decidedAt: new Date() },
        });
        if (moved.count !== 1) throw conflict('This return was updated by someone else');
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: status === 'APPROVED' ? 'RETURN_APPROVED' : 'RETURN_REJECTED' },
        });
      } else {
        if (!['APPROVED', 'PICKED_UP'].includes(r.status)) throw businessRule('Approve the return before marking it received');
        const moved = await tx.returnRequest.updateMany({
          where: { id: r.id, status: r.status },
          data: { status: 'RECEIVED', receivedAt: new Date(), restock: input.restock, decisionNote: input.note ?? r.decisionNote },
        });
        if (moved.count !== 1) throw conflict('This return was updated by someone else');
        const ledger: LedgerEntryInput[] = [];
        for (const ri of r.items) {
          const oi = ri.orderItem;
          if (input.restock && oi.listingId) {
            await this.inventory.restock(tx, oi.listingId, ri.quantity, {
              referenceType: 'RETURN',
              referenceId: r.id,
              reason: `Return ${r.returnNumber}`,
              actorId: actor?.auth?.userId,
            });
          }
          await tx.orderItem.update({
            where: { id: oi.id },
            data: { returnedQuantity: { increment: ri.quantity }, status: toPaise(ri.refundAmount) > 0 ? 'REFUND_PENDING' : 'RETURNED' },
          });
          // Reverse seller earnings only if they were already credited.
          if (r.sellerOrder.codCollected) {
            const base = prorate(toPaise(oi.lineSubtotal) - toPaise(oi.sellerFundedDiscount), ri.quantity, oi.quantity);
            const commission = prorate(toPaise(oi.commissionAmount), ri.quantity, oi.quantity);
            const commissionTax = prorate(toPaise(oi.commission?.taxAmount ?? 0), ri.quantity, oi.quantity);
            const common = { sellerId: r.sellerOrder.sellerId, orderId: r.orderId, sellerOrderId: r.sellerOrderId, orderItemId: oi.id, actorId: actor?.auth?.userId };
            ledger.push(
              { ...common, type: 'REFUND_DEBIT', amount: -base, description: `Return ${r.returnNumber} · ${oi.productName} × ${ri.quantity}` },
              { ...common, type: 'COMMISSION_REVERSAL_CREDIT', amount: commission + commissionTax, description: `Commission reversed · ${r.returnNumber}` },
            );
          }
        }
        await this.finance.post(tx, ledger);
        if (toPaise(r.refundAmount) > 0) {
          const payment = r.order.payments[0];
          await tx.refund.create({
            data: {
              orderId: r.orderId,
              paymentId: payment?.id ?? null,
              returnRequestId: r.id,
              amount: r.refundAmount,
              method: 'bank_transfer',
              reason: `Return ${r.returnNumber}: ${r.reason}`,
            },
          });
          if (payment && payment.status === 'PAID') {
            await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUND_PENDING' } });
            await tx.order.update({ where: { id: r.orderId }, data: { paymentStatus: 'REFUND_PENDING' } });
          }
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: r.orderId,
          sellerOrderId: r.sellerOrderId,
          toStatus: input.decision === 'APPROVE' ? 'RETURN_APPROVED' : input.decision === 'REJECT' ? 'RETURN_REJECTED' : 'RETURNED',
          note: `Return ${r.returnNumber}${input.note ? `: ${input.note}` : ''}`,
          actorId: actor?.auth?.userId ?? null,
          actorRole: this.actorRole(actor),
        },
      });
      await this.audit.record(actor, { action: `return.${input.decision.toLowerCase()}`, entityType: 'ReturnRequest', entityId: r.id, after: input }, tx);
      return r;
    });
    await this.indexer.refresh(rr.items.map((i) => i.orderItem.productId).filter(Boolean) as string[]);
    const status = input.decision === 'APPROVE' ? 'approved' : input.decision === 'REJECT' ? 'rejected' : 'received — refund initiated';
    await this.notifications.notify({
      key: 'return.updated',
      userId: rr.customerId,
      link: `/account/orders/${rr.orderId}`,
      vars: { returnNumber: rr.returnNumber, status, note: input.note ?? '' },
    });
  }

  /** Customer withdraws a return that has not been received yet. */
  async cancelReturn(userId: string, returnId: string, actor: AuditActor) {
    await this.db.$transaction(async (tx) => {
      const r = await tx.returnRequest.findFirst({ where: { id: returnId, customerId: userId }, include: { items: true } });
      if (!r) throw notFound('Return request');
      if (!['REQUESTED', 'APPROVED'].includes(r.status)) throw businessRule('This return can no longer be cancelled');
      await tx.returnRequest.update({ where: { id: r.id }, data: { status: 'CANCELLED' } });
      await tx.orderItem.updateMany({ where: { id: { in: r.items.map((i) => i.orderItemId) } }, data: { status: 'DELIVERED' } });
      await this.audit.record(actor, { action: 'return.cancel', entityType: 'ReturnRequest', entityId: r.id }, tx);
    });
  }

  // ── Refunds (admin) ────────────────────────────────────────
  async processRefund(refundId: string, input: { reference?: string; method?: string; failed?: boolean; note?: string }, actor: AuditActor) {
    await this.db.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { returnRequest: { include: { items: true } } } });
      if (!refund) throw notFound('Refund');
      if (refund.status !== 'PENDING') throw businessRule('This refund has already been processed');
      if (!input.failed && !input.reference) throw badRequest('Enter the refund transfer reference');
      const status = input.failed ? 'FAILED' : 'PROCESSED';
      const moved = await tx.refund.updateMany({
        where: { id: refund.id, status: 'PENDING' },
        data: { status, reference: input.reference ?? null, method: input.method ?? refund.method, processedAt: new Date(), reason: input.note ?? refund.reason },
      });
      if (moved.count !== 1) throw conflict('Refund changed in the meantime');
      if (status === 'PROCESSED') {
        await tx.order.update({ where: { id: refund.orderId }, data: { refundedTotal: { increment: refund.amount } } });
        if (refund.paymentId) await tx.payment.update({ where: { id: refund.paymentId }, data: { refunded: { increment: refund.amount } } });
        if (refund.returnRequest) {
          await tx.returnRequest.update({ where: { id: refund.returnRequest.id }, data: { status: 'REFUNDED' } });
          await tx.orderItem.updateMany({ where: { id: { in: refund.returnRequest.items.map((i) => i.orderItemId) } }, data: { status: 'REFUNDED' } });
        }
      }
      // Recompute payment status.
      if (refund.paymentId) {
        const p = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
        const pending = await tx.refund.count({ where: { paymentId: p.id, status: 'PENDING' } });
        const next =
          pending > 0 ? 'REFUND_PENDING' : toPaise(p.refunded) >= toPaise(p.collected) && toPaise(p.collected) > 0 ? 'REFUNDED' : toPaise(p.collected) > 0 ? 'PAID' : p.status;
        await tx.payment.update({ where: { id: p.id }, data: { status: next } });
        await tx.order.update({ where: { id: refund.orderId }, data: { paymentStatus: next } });
      }
      await this.audit.record(actor, { action: `refund.${status.toLowerCase()}`, entityType: 'Refund', entityId: refund.id, after: input }, tx);
    });
  }
}

export type { Prisma };
