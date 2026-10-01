import type { OrderStatus, Prisma, PrismaClient } from '@prisma/client';
import { CUSTOMER_CANCELLABLE, ORDER_STATUS_LABELS } from '@vyora/shared';
import { notFound } from '../../shared/errors';
import { num, toPaise, fromPaise } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import { escapeHtml } from '../notifications/templates';

interface ListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  sellerId?: string;
}

const dateRange = (q: ListQuery) =>
  q.from || q.to ? { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } : undefined;

const money = (v: Prisma.Decimal | number | null | undefined) => num(v);

/** Customer-safe item projection (no commission / seller-finance fields). */
function customerItem(i: Prisma.OrderItemGetPayload<object>) {
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    variantName: i.variantName,
    sku: i.sku,
    imageUrl: i.imageUrl,
    sellerName: i.sellerName,
    unitPrice: money(i.unitPrice),
    unitMrp: money(i.unitMrp),
    quantity: i.quantity,
    cancelledQuantity: i.cancelledQuantity,
    returnedQuantity: i.returnedQuantity,
    discount: money(i.discountAmount),
    shipping: money(i.shippingAmount),
    taxRate: money(i.taxRate),
    tax: money(i.taxAmount),
    lineTotal: money(i.lineTotal),
    status: i.status,
    isReturnable: i.isReturnable,
    returnWindowDays: i.returnWindowDays,
  };
}

export class OrderQueryService {
  constructor(private readonly db: PrismaClient) {}

  // ── Customer ───────────────────────────────────────────────
  async customerOrders(userId: string, q: ListQuery) {
    const where: Prisma.OrderWhereInput = {
      customerId: userId,
      ...(q.status ? { status: q.status } : {}),
      ...(dateRange(q) ? { placedAt: dateRange(q) } : {}),
      ...(q.q ? { OR: [{ orderNumber: { contains: q.q } }, { items: { some: { productName: { contains: q.q } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, imageUrl: true, quantity: true, status: true, variantName: true } },
          sellerOrders: { select: { id: true, status: true } },
        },
      }),
      this.db.order.count({ where }),
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items.slice(0, 4),
        shipments: o.sellerOrders.length,
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async customerOrder(userId: string, orderId: string) {
    const o = await this.db.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        items: true,
        sellerOrders: {
          include: {
            seller: { select: { displayName: true, slug: true } },
            shipments: { include: { events: { orderBy: { occurredAt: 'asc' } } }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        returns: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!o) throw notFound('Order');
    const payment = o.payments[0];
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      placedAt: o.placedAt,
      deliveredAt: o.deliveredAt,
      cancelledAt: o.cancelledAt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingMethod: o.shippingMethod,
      couponCode: o.couponCode,
      notes: o.notes,
      address: {
        fullName: o.shipName,
        phone: o.shipPhone,
        line1: o.shipLine1,
        line2: o.shipLine2,
        landmark: o.shipLandmark,
        city: o.shipCity,
        state: o.shipState,
        pincode: o.shipPincode,
      },
      totals: {
        mrpTotal: money(o.mrpTotal),
        itemsSubtotal: money(o.itemsSubtotal),
        discount: money(o.discountTotal),
        shipping: money(o.shippingTotal),
        codFee: money(o.codFee),
        tax: money(o.taxTotal),
        grandTotal: money(o.grandTotal),
        refunded: money(o.refundedTotal),
        amountDue: payment ? fromPaise(Math.max(0, toPaise(payment.amount) - toPaise(payment.collected))) : 0,
        payable: payment ? money(payment.amount) : money(o.grandTotal),
      },
      sellerOrders: o.sellerOrders.map((so) => ({
        id: so.id,
        subOrderNumber: so.subOrderNumber,
        status: so.status,
        statusLabel: ORDER_STATUS_LABELS[so.status],
        seller: so.seller,
        canCancel: CUSTOMER_CANCELLABLE.includes(so.status),
        deliveredAt: so.deliveredAt,
        shippedAt: so.shippedAt,
        total: money(so.grandTotal),
        items: o.items.filter((i) => i.sellerOrderId === so.id).map((i) => {
          const deadline = so.deliveredAt ? so.deliveredAt.getTime() + i.returnWindowDays * 86400_000 : null;
          const inReturn = o.returns
            .filter((r) => !['REJECTED', 'CANCELLED'].includes(r.status))
            .flatMap((r) => r.items)
            .filter((ri) => ri.orderItemId === i.id)
            .reduce((s, ri) => s + ri.quantity, 0);
          return {
            ...customerItem(i),
            returnableQuantity:
              so.status === 'DELIVERED' && i.isReturnable && deadline && Date.now() <= deadline
                ? Math.max(0, i.quantity - i.cancelledQuantity - inReturn)
                : 0,
            returnDeadline: deadline ? new Date(deadline) : null,
          };
        }),
        shipments: so.shipments.map((s) => ({
          id: s.id,
          carrier: s.carrier,
          trackingNumber: s.trackingNumber,
          trackingUrl: s.trackingUrl,
          status: s.status,
          shippedAt: s.shippedAt,
          deliveredAt: s.deliveredAt,
          estimatedFrom: s.estimatedFrom,
          estimatedTo: s.estimatedTo,
          events: s.events,
        })),
      })),
      history: o.statusHistory.map((h) => ({ id: h.id, sellerOrderId: h.sellerOrderId, fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt })),
      returns: o.returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        status: r.status,
        reason: r.reason,
        refundAmount: money(r.refundAmount),
        createdAt: r.createdAt,
        decisionNote: r.decisionNote,
        items: r.items.map((ri) => ({ orderItemId: ri.orderItemId, quantity: ri.quantity, refundAmount: money(ri.refundAmount) })),
      })),
      refunds: o.refunds.map((r) => ({ id: r.id, amount: money(r.amount), status: r.status, method: r.method, reference: r.reference, processedAt: r.processedAt, createdAt: r.createdAt })),
      payment: payment
        ? { status: payment.status, amount: money(payment.amount), collected: money(payment.collected), refunded: money(payment.refunded), paidAt: payment.paidAt }
        : null,
    };
  }

  // ── Seller (strictly scoped to the authenticated seller) ───
  async sellerOrders(sellerId: string, q: ListQuery) {
    const where: Prisma.SellerOrderWhereInput = {
      sellerId,
      ...(q.status ? { status: q.status } : {}),
      ...(dateRange(q) ? { createdAt: dateRange(q) } : {}),
      ...(q.q
        ? { OR: [{ subOrderNumber: { contains: q.q } }, { items: { some: { OR: [{ productName: { contains: q.q } }, { sku: { contains: q.q } }] } } }] }
        : {}),
    };
    const [items, total, counts] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { select: { id: true, productName: true, variantName: true, sku: true, imageUrl: true, quantity: true, cancelledQuantity: true, unitPrice: true, status: true } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true, shipState: true, shipPincode: true, paymentMethod: true, placedAt: true } },
        },
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.groupBy({ by: ['status'], where: { sellerId }, _count: { _all: true } }),
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          status: so.status,
          statusLabel: ORDER_STATUS_LABELS[so.status],
          placedAt: so.order.placedAt,
          paymentMethod: so.order.paymentMethod,
          codCollected: so.codCollected,
          customer: { name: so.order.shipName, city: so.order.shipCity, state: so.order.shipState, pincode: so.order.shipPincode },
          total: money(so.grandTotal),
          commission: money(so.commissionTotal),
          items: so.items.map((i) => ({ ...i, unitPrice: money(i.unitPrice) })),
        })),
        total,
        q.page,
        q.pageSize,
      ),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    };
  }

  async sellerOrder(sellerOrderId: string, scope: { sellerId: string | null }) {
    const so = await this.db.sellerOrder.findFirst({
      where: { id: sellerOrderId, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
      include: {
        items: { include: { commission: true } },
        order: true,
        seller: { select: { id: true, displayName: true, code: true, fulfillmentMode: true, addresses: { where: { isPickup: true }, take: 1 } } },
        shipments: { include: { events: { orderBy: { occurredAt: 'asc' } }, items: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        returns: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!so) throw notFound('Order');
    return {
      id: so.id,
      subOrderNumber: so.subOrderNumber,
      orderId: scope.sellerId ? undefined : so.orderId,
      orderNumber: so.order.orderNumber,
      status: so.status,
      statusLabel: ORDER_STATUS_LABELS[so.status],
      fulfillmentMode: so.fulfillmentMode,
      placedAt: so.order.placedAt,
      confirmedAt: so.confirmedAt,
      shippedAt: so.shippedAt,
      deliveredAt: so.deliveredAt,
      cancelledAt: so.cancelledAt,
      cancelReason: so.cancelReason,
      paymentMethod: so.order.paymentMethod,
      codCollected: so.codCollected,
      codCollectedAt: so.codCollectedAt,
      shippingMethod: so.order.shippingMethod,
      // Delivery details needed to fulfil — no customer email or account data.
      deliveryAddress: {
        fullName: so.order.shipName,
        phone: so.order.shipPhone,
        line1: so.order.shipLine1,
        line2: so.order.shipLine2,
        landmark: so.order.shipLandmark,
        city: so.order.shipCity,
        state: so.order.shipState,
        pincode: so.order.shipPincode,
      },
      seller: { id: so.seller.id, name: so.seller.displayName, code: so.seller.code, pickupAddress: so.seller.addresses[0] ?? null },
      totals: {
        itemsSubtotal: money(so.itemsSubtotal),
        discount: money(so.discountTotal),
        shipping: money(so.shippingTotal),
        tax: money(so.taxTotal),
        total: money(so.grandTotal),
        commission: money(so.commissionTotal),
      },
      items: so.items.map((i) => ({
        ...customerItem(i),
        sellerFundedDiscount: money(i.sellerFundedDiscount),
        commissionRate: money(i.commissionRate),
        commissionAmount: money(i.commissionAmount),
        commissionTax: money(i.commission?.taxAmount),
        hsnCode: i.hsnCode,
      })),
      shipments: so.shipments,
      history: so.statusHistory,
      returns: so.returns.map((r) => ({ ...r, refundAmount: money(r.refundAmount), items: r.items.map((ri) => ({ ...ri, refundAmount: money(ri.refundAmount) })) })),
    };
  }

  /** Printable packing slip (HTML) for a seller sub-order. */
  async packingSlip(sellerOrderId: string, scope: { sellerId: string | null }, brand: string) {
    const so = await this.sellerOrder(sellerOrderId, scope);
    const rows = so.items
      .filter((i) => i.quantity - i.cancelledQuantity > 0)
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.sku)}</td><td>${escapeHtml(i.productName)}${i.variantName ? ` <small>(${escapeHtml(i.variantName)})</small>` : ''}</td><td class="r">${i.quantity - i.cancelledQuantity}</td></tr>`,
      )
      .join('');
    const a = so.deliveryAddress;
    const cod = so.paymentMethod === 'COD' ? `<p class="cod">CASH ON DELIVERY — collect ₹${so.totals.total.toFixed(2)}</p>` : '';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Packing slip ${escapeHtml(so.subOrderNumber)}</title>
<style>body{font-family:system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}.r{text-align:right}.grid{display:flex;gap:32px;margin-top:16px}
.box{flex:1;border:1px solid #ccc;padding:12px;font-size:13px;line-height:1.5}.cod{font-weight:700;border:2px dashed #111;padding:8px;text-align:center}
@media print{button{display:none}}</style></head><body>
<button onclick="window.print()">Print</button>
<h1>${escapeHtml(brand)} · Packing slip</h1>
<p>Sub-order <b>${escapeHtml(so.subOrderNumber)}</b> · Order ${escapeHtml(so.orderNumber)} · Placed ${so.placedAt.toISOString().slice(0, 10)}</p>
${cod}
<div class="grid"><div class="box"><b>Ship to</b><br>${escapeHtml(a.fullName)}<br>${escapeHtml(a.line1)}${a.line2 ? `<br>${escapeHtml(a.line2)}` : ''}${a.landmark ? `<br>Near ${escapeHtml(a.landmark)}` : ''}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}<br>Phone: ${escapeHtml(a.phone)}</div>
<div class="box"><b>From</b><br>${escapeHtml(so.seller.name)} (${escapeHtml(so.seller.code)})${so.seller.pickupAddress ? `<br>${escapeHtml(so.seller.pickupAddress.line1)}<br>${escapeHtml(so.seller.pickupAddress.city)}, ${escapeHtml(so.seller.pickupAddress.state)} ${escapeHtml(so.seller.pickupAddress.pincode)}` : ''}</div></div>
<table><thead><tr><th>SKU</th><th>Item</th><th class="r">Qty</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  }

  // ── Admin ──────────────────────────────────────────────────
  async adminOrders(q: ListQuery & { paymentStatus?: string }) {
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus as never } : {}),
      ...(q.sellerId ? { sellerOrders: { some: { sellerId: q.sellerId } } } : {}),
      ...(dateRange(q) ? { placedAt: dateRange(q) } : {}),
      ...(q.q
        ? {
            OR: [
              { orderNumber: { contains: q.q } },
              { shipName: { contains: q.q } },
              { shipPhone: { contains: q.q } },
              { customer: { email: { contains: q.q } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          customer: { select: { id: true, name: true, email: true } },
          sellerOrders: { select: { id: true, subOrderNumber: true, status: true, codCollected: true, seller: { select: { displayName: true } } } },
          _count: { select: { items: true } },
        },
      }),
      this.db.order.count({ where }),
    ]);
    return paginated(
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        grandTotal: money(o.grandTotal),
        placedAt: o.placedAt,
        customer: o.customer,
        city: o.shipCity,
        itemCount: o._count.items,
        sellerOrders: o.sellerOrders,
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async adminOrder(orderId: string) {
    const o = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { commission: true } },
        sellerOrders: { include: { seller: { select: { id: true, displayName: true, code: true } }, shipments: { include: { events: true } } } },
        payments: { include: { refunds: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        returns: { include: { items: true } },
        refunds: true,
        couponUsages: true,
      },
    });
    if (!o) throw notFound('Order');
    return JSON.parse(JSON.stringify(o, (_k, v) => (v && typeof v === 'object' && v.constructor?.name === 'Decimal' ? Number(v) : v)));
  }

  async returns(scope: { sellerId: string | null; customerId?: string }, q: { page: number; pageSize: number; status?: string }) {
    const where: Prisma.ReturnRequestWhereInput = {
      ...(scope.sellerId ? { sellerOrder: { sellerId: scope.sellerId } } : {}),
      ...(scope.customerId ? { customerId: scope.customerId } : {}),
      ...(q.status ? { status: q.status as never } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: {
          items: { include: { orderItem: { select: { productName: true, variantName: true, sku: true, imageUrl: true } } } },
          sellerOrder: { select: { id: true, subOrderNumber: true, seller: { select: { displayName: true } } } },
          order: { select: { orderNumber: true, shipName: true, shipCity: true } },
          refunds: true,
        },
      }),
      this.db.returnRequest.count({ where }),
    ]);
    return paginated(
      items.map((r) => ({
        ...r,
        refundAmount: money(r.refundAmount),
        items: r.items.map((i) => ({ ...i, refundAmount: money(i.refundAmount) })),
        refunds: r.refunds.map((f) => ({ ...f, amount: money(f.amount) })),
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async refunds(q: { page: number; pageSize: number; status?: string }) {
    const where: Prisma.RefundWhereInput = q.status ? { status: q.status as never } : {};
    const [items, total] = await Promise.all([
      this.db.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
        include: { order: { select: { orderNumber: true, shipName: true, customer: { select: { email: true } } } }, returnRequest: { select: { returnNumber: true } } },
      }),
      this.db.refund.count({ where }),
    ]);
    return paginated(items.map((r) => ({ ...r, amount: money(r.amount) })), total, q.page, q.pageSize);
  }

  /** Delivered sub-orders whose COD cash has not been reconciled yet. */
  async codPending(q: { page: number; pageSize: number }) {
    const where: Prisma.SellerOrderWhereInput = { status: 'DELIVERED', codCollected: false, order: { paymentMethod: 'COD' } };
    const [items, total, agg] = await Promise.all([
      this.db.sellerOrder.findMany({
        where,
        orderBy: { deliveredAt: 'asc' },
        ...pageArgs(q.page, q.pageSize),
        include: { seller: { select: { displayName: true } }, order: { select: { orderNumber: true, shipName: true, shipCity: true } }, items: true },
      }),
      this.db.sellerOrder.count({ where }),
      this.db.sellerOrder.aggregate({ where, _sum: { grandTotal: true } }),
    ]);
    return {
      ...paginated(
        items.map((so) => ({
          id: so.id,
          subOrderNumber: so.subOrderNumber,
          orderNumber: so.order.orderNumber,
          seller: so.seller.displayName,
          customer: so.order.shipName,
          city: so.order.shipCity,
          deliveredAt: so.deliveredAt,
          amountDue: fromPaise(so.items.reduce((s, i) => s + Math.round((toPaise(i.lineTotal) * (i.quantity - i.cancelledQuantity)) / i.quantity), 0)),
        })),
        total,
        q.page,
        q.pageSize,
      ),
      totalOutstanding: money(agg._sum.grandTotal),
    };
  }
}
