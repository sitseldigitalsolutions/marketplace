import type { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import type { FinanceService } from '../finance/finance.service';
import type { ProductService } from '../catalog/product.service';

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface Range {
  from: Date;
  to: Date;
}

/** Offset (minutes) of an IANA timezone from UTC at a given instant. */
export function tzOffsetMinutes(timeZone: string, at = new Date()): number {
  const local = new Date(at.toLocaleString('en-US', { timeZone }));
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

export function defaultRange(from?: Date, to?: Date): Range {
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * 86400_000);
  return { from: start, to: end };
}

/**
 * Financial definitions used throughout the dashboards:
 *  • GMV (gross order value)  — Σ grand totals of orders placed in the range (as placed).
 *  • Net order value          — GMV minus cancelled items.
 *  • Delivered value          — value of delivered, non-cancelled items.
 *  • Collected revenue        — cash actually received (COD collections confirmed).
 *  • Refunds                  — refunds processed.
 *  • Commission (accrued)     — commission on non-cancelled items of orders in range.
 *  • Commission (earned)      — commission posted to seller ledgers (after COD collection), net of reversals.
 */
export class AnalyticsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly finance: FinanceService,
    private readonly products: ProductService,
    private readonly timeZone = 'Asia/Kolkata',
  ) {}

  /** Calendar day (YYYY-MM-DD) in the marketplace timezone. */
  private localDay(d: Date, offset: number) {
    return new Date(d.getTime() + offset * 60000).toISOString().slice(0, 10);
  }

  async adminDashboard(range: Range) {
    const { from, to } = range;
    const [orderAgg] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COUNT(*) AS orders,
             COALESCE(SUM(grandTotal), 0) AS gmv,
             SUM(status = 'CANCELLED') AS cancelled,
             COUNT(DISTINCT customerId) AS buyers
      FROM \`Order\` WHERE placedAt BETWEEN ${from} AND ${to}`;
    const [itemAgg] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS netValue,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredValue,
             COALESCE(SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS commissionAccrued,
             COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.quantity - oi.cancelledQuantity ELSE 0 END), 0) AS deliveredUnits,
             COALESCE(SUM(oi.returnedQuantity), 0) AS returnedUnits
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [payAgg] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(SUM(p.collected), 0) AS collected,
             COALESCE(SUM(CASE WHEN p.status = 'COD_PENDING' THEN p.amount - p.collected ELSE 0 END), 0) AS codOutstanding
      FROM \`Payment\` p JOIN \`Order\` o ON o.id = p.orderId WHERE o.placedAt BETWEEN ${from} AND ${to}`;
    const [refundAgg] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(SUM(CASE WHEN status = 'PROCESSED' THEN amount ELSE 0 END), 0) AS refunded,
             COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS refundPending
      FROM \`Refund\` WHERE createdAt BETWEEN ${from} AND ${to}`;
    const [ledgerAgg] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(-SUM(CASE WHEN type = 'COMMISSION_DEBIT' THEN amount ELSE 0 END), 0) AS commissionEarned,
             COALESCE(SUM(CASE WHEN type = 'COMMISSION_REVERSAL_CREDIT' THEN amount ELSE 0 END), 0) AS commissionReversed
      FROM \`SellerLedger\` WHERE createdAt BETWEEN ${from} AND ${to}`;

    const [customers, newCustomers, activeSellers, pendingSellers, pendingProducts, lowStock, outstanding] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null, roles: { some: { role: { code: 'CUSTOMER' } } }, seller: null } }),
      this.db.user.count({ where: { createdAt: { gte: from, lte: to }, seller: null } }),
      this.db.seller.count({ where: { status: 'APPROVED', deletedAt: null } }),
      this.db.seller.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
      this.db.product.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
      this.db.$queryRaw<Array<{ c: bigint }>>`SELECT COUNT(*) AS c FROM \`Inventory\` WHERE quantity - reserved <= lowStockThreshold`,
      this.finance.outstanding(),
    ]);

    const orders = n(orderAgg.orders);
    const cancelled = n(orderAgg.cancelled);
    const nonCancelled = orders - cancelled;
    const deliveredUnits = n(itemAgg.deliveredUnits);
    return {
      range,
      kpis: {
        gmv: r2(n(orderAgg.gmv)),
        netOrderValue: r2(n(itemAgg.netValue)),
        deliveredValue: r2(n(itemAgg.deliveredValue)),
        collectedRevenue: r2(n(payAgg.collected)),
        codOutstanding: r2(n(payAgg.codOutstanding)),
        refunds: r2(n(refundAgg.refunded)),
        refundsPending: r2(n(refundAgg.refundPending)),
        commissionAccrued: r2(n(itemAgg.commissionAccrued)),
        commissionEarned: r2(n(ledgerAgg.commissionEarned)),
        orders,
        cancelledOrders: cancelled,
        averageOrderValue: nonCancelled ? r2(n(itemAgg.netValue) / nonCancelled) : 0,
        cancellationRate: orders ? r2((cancelled / orders) * 100) : 0,
        returnRate: deliveredUnits ? r2((n(itemAgg.returnedUnits) / deliveredUnits) * 100) : 0,
        buyers: n(orderAgg.buyers),
        totalCustomers: customers,
        newCustomers,
        activeSellers,
        pendingSellerApprovals: pendingSellers,
        pendingProductApprovals: pendingProducts,
        lowStockListings: n(lowStock[0]?.c),
        outstandingSettlements: r2(outstanding.reduce((s, o) => s + o.available, 0)),
      },
      salesByDay: await this.salesByDay(range),
      topProducts: await this.topProducts(range, null, 8),
      topSellers: await this.topSellers(range, 8),
      categorySales: await this.categorySales(range),
      orderStatus: await this.db.order.groupBy({ by: ['status'], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true } }).then((rows) => rows.map((r) => ({ status: r.status, count: r._count._all }))),
      paymentStatus: await this.db.order.groupBy({ by: ['paymentStatus'], where: { placedAt: { gte: from, lte: to } }, _count: { _all: true }, _sum: { grandTotal: true } }).then((rows) => rows.map((r) => ({ status: r.paymentStatus, count: r._count._all, amount: n(r._sum.grandTotal) }))),
    };
  }

  /** Daily series bucketed by the marketplace's local calendar day (not UTC). */
  async salesByDay(range: Range, sellerId: string | null = null) {
    const offset = tzOffsetMinutes(this.timeZone, range.to);
    const rows = await this.db.$queryRaw<Array<{ day: string; orders: bigint; value: unknown; units: unknown }>>`
      SELECT DATE_FORMAT(DATE_ADD(o.placedAt, INTERVAL ${offset} MINUTE), '%Y-%m-%d') AS day,
             COUNT(DISTINCT oi.sellerOrderId) AS orders,
             COALESCE(SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity), 0) AS value,
             COALESCE(SUM(oi.quantity - oi.cancelledQuantity), 0) AS units
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY day ORDER BY day`;
    const map = new Map(rows.map((r) => [r.day, r]));
    const out = [];
    const last = this.localDay(range.to, offset);
    for (let key = this.localDay(range.from, offset); key <= last; key = new Date(Date.parse(`${key}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10)) {
      const row = map.get(key);
      out.push({ day: key, orders: n(row?.orders), value: r2(n(row?.value)), units: n(row?.units) });
    }
    return out;
  }

  async topProducts(range: Range, sellerId: string | null, limit: number) {
    const rows = await this.db.$queryRaw<Array<{ productId: string; name: string; units: unknown; value: unknown }>>`
      SELECT oi.productId AS productId, MAX(oi.productName) AS name,
             SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to} AND (${sellerId} IS NULL OR oi.sellerId = ${sellerId})
      GROUP BY oi.productId HAVING units > 0 ORDER BY units DESC LIMIT ${limit}`;
    return rows.map((r) => ({ productId: r.productId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }

  async topSellers(range: Range, limit: number) {
    const rows = await this.db.$queryRaw<Array<{ sellerId: string; name: string; orders: bigint; value: unknown; commission: unknown }>>`
      SELECT oi.sellerId AS sellerId, MAX(oi.sellerName) AS name, COUNT(DISTINCT oi.sellerOrderId) AS orders,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value,
             SUM(oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS commission
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY oi.sellerId ORDER BY value DESC LIMIT ${limit}`;
    return rows.map((r) => ({ sellerId: r.sellerId, name: r.name, orders: n(r.orders), value: r2(n(r.value)), commission: r2(n(r.commission)) }));
  }

  async categorySales(range: Range) {
    const rows = await this.db.$queryRaw<Array<{ categoryId: string; name: string; units: unknown; value: unknown }>>`
      SELECT c.id AS categoryId, c.name AS name, SUM(oi.quantity - oi.cancelledQuantity) AS units,
             SUM(oi.lineTotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity) AS value
      FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId JOIN \`Category\` c ON c.id = oi.categoryId
      WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      GROUP BY c.id, c.name ORDER BY value DESC LIMIT 12`;
    return rows.map((r) => ({ categoryId: r.categoryId, name: r.name, units: n(r.units), value: r2(n(r.value)) }));
  }

  /** Seller dashboard — every figure is filtered by the authenticated seller's id. */
  async sellerDashboard(sellerId: string, range: Range) {
    const [productCounts, activeListings, outOfStock, orderCounts, balances, recent] = await Promise.all([
      this.products.statusCounts({ kind: 'seller', sellerId }),
      this.db.sellerProductListing.count({ where: { sellerId, status: 'APPROVED', isActive: true, deletedAt: null } }),
      this.db.$queryRaw<Array<{ c: bigint }>>`
        SELECT COUNT(*) AS c FROM \`Inventory\` i JOIN \`SellerProductListing\` l ON l.id = i.listingId
        WHERE i.sellerId = ${sellerId} AND l.deletedAt IS NULL AND i.quantity - i.reserved <= 0`,
      this.db.sellerOrder.groupBy({ by: ['status'], where: { sellerId }, _count: { _all: true } }),
      this.finance.balances(sellerId),
      this.db.sellerOrder.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, subOrderNumber: true, status: true, grandTotal: true, createdAt: true, order: { select: { shipName: true, shipCity: true } }, _count: { select: { items: true } } },
      }),
    ]);
    const [rev] = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(SUM(CASE WHEN so.status = 'DELIVERED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity - oi.returnedQuantity) / oi.quantity ELSE 0 END), 0) AS deliveredRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.lineSubtotal * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS orderedRevenue,
             COALESCE(SUM(CASE WHEN so.status <> 'CANCELLED' THEN oi.commissionAmount * (oi.quantity - oi.cancelledQuantity) / oi.quantity ELSE 0 END), 0) AS commission
      FROM \`OrderItem\` oi JOIN \`SellerOrder\` so ON so.id = oi.sellerOrderId
      WHERE oi.sellerId = ${sellerId} AND so.createdAt BETWEEN ${range.from} AND ${range.to}`;
    const oc = Object.fromEntries(orderCounts.map((o) => [o.status, o._count._all])) as Record<string, number>;
    const totalProducts = Object.values(productCounts).reduce((s, v) => s + (v ?? 0), 0);
    return {
      range,
      products: {
        total: totalProducts,
        active: activeListings,
        pending: productCounts.PENDING_REVIEW ?? 0,
        draft: productCounts.DRAFT ?? 0,
        rejected: productCounts.REJECTED ?? 0,
        outOfStock: n(outOfStock[0]?.c),
      },
      orders: {
        total: Object.values(oc).reduce((s, v) => s + v, 0),
        pending: (oc.PENDING_CONFIRMATION ?? 0) + (oc.CONFIRMED ?? 0) + (oc.PROCESSING ?? 0),
        awaitingConfirmation: oc.PENDING_CONFIRMATION ?? 0,
        shipped: (oc.SHIPPED ?? 0) + (oc.OUT_FOR_DELIVERY ?? 0),
        delivered: oc.DELIVERED ?? 0,
        cancelled: oc.CANCELLED ?? 0,
      },
      revenue: {
        ordered: r2(n(rev.orderedRevenue)),
        delivered: r2(n(rev.deliveredRevenue)),
        commissionAccrued: r2(n(rev.commission)),
        commissionDeducted: r2(balances.totals.commission + balances.totals.commissionTax - balances.totals.commissionReversals),
        netPayable: balances.availableForSettlement,
        balance: balances.balance,
        paidOut: balances.totals.paidOut,
      },
      recentOrders: recent.map((r) => ({ ...r, grandTotal: n(r.grandTotal) })),
      salesByDay: await this.salesByDay(range, sellerId),
      topProducts: await this.topProducts(range, sellerId, 5),
    };
  }

  // ── Exports ────────────────────────────────────────────────
  async report(kind: string, range: Range, sellerId: string | null): Promise<{ columns: string[]; rows: unknown[][] }> {
    switch (kind) {
      case 'sales': {
        const days = await this.salesByDay(range, sellerId);
        return { columns: ['Date', 'Orders', 'Units', 'Value (INR)'], rows: days.map((d) => [d.day, d.orders, d.units, d.value]) };
      }
      case 'orders': {
        const items = await this.db.orderItem.findMany({
          where: { order: { placedAt: { gte: range.from, lte: range.to } }, ...(sellerId ? { sellerId } : {}) },
          include: { order: { select: { orderNumber: true, placedAt: true, paymentStatus: true, shipCity: true, shipState: true } }, sellerOrder: { select: { subOrderNumber: true, status: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50000,
        });
        return {
          columns: ['Order', 'Sub-order', 'Placed at (UTC)', 'Seller', 'SKU', 'Product', 'Qty', 'Cancelled', 'Returned', 'Unit price', 'Discount', 'Shipping', 'Tax', 'Line total', 'Commission', 'Status', 'Payment', 'City', 'State'],
          rows: items.map((i) => [
            i.order.orderNumber, i.sellerOrder.subOrderNumber, i.order.placedAt.toISOString(), i.sellerName, i.sku, i.productName, i.quantity,
            i.cancelledQuantity, i.returnedQuantity, n(i.unitPrice), n(i.discountAmount), n(i.shippingAmount), n(i.taxAmount), n(i.lineTotal),
            n(i.commissionAmount), i.sellerOrder.status, i.order.paymentStatus, i.order.shipCity, i.order.shipState,
          ]),
        };
      }
      case 'products': {
        const top = await this.topProducts(range, sellerId, 1000);
        return { columns: ['Product ID', 'Product', 'Units', 'Value (INR)'], rows: top.map((t) => [t.productId, t.name, t.units, t.value]) };
      }
      case 'sellers': {
        const top = await this.topSellers(range, 1000);
        return { columns: ['Seller ID', 'Seller', 'Orders', 'Value (INR)', 'Commission (INR)'], rows: top.map((t) => [t.sellerId, t.name, t.orders, t.value, t.commission]) };
      }
      case 'categories': {
        const rows = await this.categorySales(range);
        return { columns: ['Category', 'Units', 'Value (INR)'], rows: rows.map((r) => [r.name, r.units, r.value]) };
      }
      case 'settlements': {
        const rows = await this.db.settlement.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...(sellerId ? { sellerId } : {}) },
          include: { seller: { select: { displayName: true, code: true } } },
          orderBy: { createdAt: 'asc' },
        });
        return {
          columns: ['Settlement', 'Seller', 'Seller code', 'Amount', 'Status', 'Reference', 'Created (UTC)', 'Paid (UTC)'],
          rows: rows.map((s) => [s.settlementNumber, s.seller.displayName, s.seller.code, n(s.amount), s.status, s.reference ?? '', s.createdAt.toISOString(), s.paidAt?.toISOString() ?? '']),
        };
      }
      case 'ledger': {
        const rows = await this.db.sellerLedger.findMany({
          where: { createdAt: { gte: range.from, lte: range.to }, ...(sellerId ? { sellerId } : {}) },
          include: { seller: { select: { displayName: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50000,
        });
        return {
          columns: ['Date (UTC)', 'Seller', 'Type', 'Description', 'Amount', 'Balance after'],
          rows: rows.map((l) => [l.createdAt.toISOString(), l.seller.displayName, l.type, l.description, n(l.amount), n(l.balanceAfter)]),
        };
      }
      default:
        throw new Error(`Unknown report: ${kind}`);
    }
  }

  async export(kind: string, range: Range, sellerId: string | null, format: 'csv' | 'xlsx') {
    const { columns, rows } = await this.report(kind, range, sellerId);
    const filename = `${kind}-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.${format}`;
    if (format === 'csv') {
      // Prefix formula-like cells to prevent CSV injection in spreadsheet apps.
      const safe = rows.map((r) => r.map((c) => (typeof c === 'string' && /^[=+\-@]/.test(c) ? `'${c}` : c)));
      return { filename, contentType: 'text/csv; charset=utf-8', data: Buffer.from(stringify([columns, ...safe])) };
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(kind);
    ws.addRow(columns).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c) => (c.width = 18));
    const data = Buffer.from(await wb.xlsx.writeBuffer());
    return { filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', data };
  }
}
