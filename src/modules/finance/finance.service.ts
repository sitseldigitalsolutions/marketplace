import type { LedgerEntryType, Prisma, PrismaClient, SettlementStatus } from '@prisma/client';
import type { z } from 'zod';
import type { commissionRuleSchema } from '@vyora/shared';
import type { Db } from '../../database/prisma/client';
import { businessRule, conflict, notFound } from '../../shared/errors';
import { decimal, fromPaise, num, toPaise, type Paise } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import { referenceNumber } from '../../shared/crypto';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { NotificationService } from '../notifications/notification.service';
import type { CommissionRuleLike } from '../orders/pricing';

type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;

export interface LedgerEntryInput {
  sellerId: string;
  type: LedgerEntryType;
  amount: Paise; // signed
  description: string;
  orderId?: string | null;
  sellerOrderId?: string | null;
  orderItemId?: string | null;
  settlementId?: string | null;
  actorId?: string | null;
}

const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'PAID', 'CANCELLED'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED: ['PROCESSING', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const OPEN_SETTLEMENT: SettlementStatus[] = ['PENDING', 'APPROVED', 'PROCESSING', 'FAILED'];

/**
 * Seller ledger & settlements. The ledger is append-only: every financial event (sale credit,
 * commission, refunds, payouts, manual adjustments) is a new signed row. Balances are always
 * Σ amount, computed under a per-seller row lock so concurrent postings stay consistent.
 */
export class FinanceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly defaultCommission: number,
  ) {}

  async post(tx: Db, entries: LedgerEntryInput[]) {
    const bySeller = new Map<string, LedgerEntryInput[]>();
    for (const e of entries.filter((e) => e.amount !== 0)) {
      if (!bySeller.has(e.sellerId)) bySeller.set(e.sellerId, []);
      bySeller.get(e.sellerId)!.push(e);
    }
    for (const [sellerId, list] of bySeller) {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${sellerId} FOR UPDATE`;
      const agg = await tx.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } });
      let balance = toPaise(agg._sum.amount);
      for (const e of list) {
        balance += e.amount;
        await tx.sellerLedger.create({
          data: {
            sellerId,
            type: e.type,
            amount: decimal(e.amount),
            balanceAfter: decimal(balance),
            description: e.description.slice(0, 300),
            orderId: e.orderId ?? null,
            sellerOrderId: e.sellerOrderId ?? null,
            orderItemId: e.orderItemId ?? null,
            settlementId: e.settlementId ?? null,
            actorId: e.actorId ?? null,
          },
        });
      }
    }
  }

  async balances(sellerId: string, db: Db = this.db) {
    const [ledger, open, byType] = await Promise.all([
      db.sellerLedger.aggregate({ where: { sellerId }, _sum: { amount: true } }),
      db.settlement.aggregate({ where: { sellerId, status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } }),
      db.sellerLedger.groupBy({ by: ['type'], where: { sellerId }, _sum: { amount: true } }),
    ]);
    const balance = toPaise(ledger._sum.amount);
    const reserved = toPaise(open._sum.amount);
    const t = (type: LedgerEntryType) => toPaise(byType.find((b) => b.type === type)?._sum.amount);
    return {
      balance: fromPaise(balance),
      inSettlement: fromPaise(reserved),
      availableForSettlement: fromPaise(Math.max(0, balance - reserved)),
      totals: {
        sales: fromPaise(t('SALE_CREDIT')),
        shipping: fromPaise(t('SHIPPING_CREDIT')),
        commission: fromPaise(-t('COMMISSION_DEBIT')),
        commissionTax: fromPaise(-t('COMMISSION_TAX_DEBIT')),
        refunds: fromPaise(-t('REFUND_DEBIT')),
        commissionReversals: fromPaise(t('COMMISSION_REVERSAL_CREDIT')),
        paidOut: fromPaise(-t('SETTLEMENT_PAYOUT')),
        adjustments: fromPaise(t('MANUAL_ADJUSTMENT')),
      },
    };
  }

  async ledger(sellerId: string, q: { page: number; pageSize: number; type?: LedgerEntryType; from?: Date; to?: Date }) {
    const where: Prisma.SellerLedgerWhereInput = {
      sellerId,
      ...(q.type ? { type: q.type } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.sellerLedger.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q.page, q.pageSize) }),
      this.db.sellerLedger.count({ where }),
    ]);
    return paginated(
      items.map((i) => ({ ...i, amount: num(i.amount), balanceAfter: num(i.balanceAfter) })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async adjust(input: { sellerId: string; amount: number; reason: string }, actor: AuditActor) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound('Seller');
    await this.db.$transaction(async (tx) => {
      await this.post(tx, [
        {
          sellerId: input.sellerId,
          type: 'MANUAL_ADJUSTMENT',
          amount: toPaise(input.amount),
          description: `Manual adjustment: ${input.reason}`,
          actorId: actor?.auth?.userId,
        },
      ]);
      await this.audit.record(actor, { action: 'ledger.adjust', entityType: 'Seller', entityId: input.sellerId, after: input }, tx);
    });
    return this.balances(input.sellerId);
  }

  // ── Settlements ────────────────────────────────────────────
  async createSettlement(
    input: { sellerId: string; amount: number; periodStart?: Date; periodEnd?: Date; notes?: string },
    actor: AuditActor,
  ) {
    const seller = await this.db.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw notFound('Seller');
    const settlement = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Seller\` WHERE id = ${input.sellerId} FOR UPDATE`;
      const b = await this.balances(input.sellerId, tx);
      if (toPaise(input.amount) > toPaise(b.availableForSettlement)) {
        throw businessRule(`Amount exceeds the seller's available balance of ₹${b.availableForSettlement.toFixed(2)}`);
      }
      const s = await tx.settlement.create({
        data: {
          settlementNumber: referenceNumber('ST'),
          sellerId: input.sellerId,
          amount: decimal(toPaise(input.amount)),
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          notes: input.notes ?? null,
          createdById: actor?.auth?.userId ?? null,
          transactions: {
            create: { toStatus: 'PENDING', amount: decimal(toPaise(input.amount)), note: input.notes ?? null, actorId: actor?.auth?.userId ?? null },
          },
        },
      });
      await this.audit.record(actor, { action: 'settlement.create', entityType: 'Settlement', entityId: s.id, after: input }, tx);
      return s;
    });
    await this.notifySettlement(settlement.id);
    return settlement;
  }

  async changeSettlementStatus(
    id: string,
    to: SettlementStatus,
    input: { reference?: string; notes?: string },
    actor: AuditActor,
  ) {
    const s = await this.db.settlement.findUnique({ where: { id } });
    if (!s) throw notFound('Settlement');
    if (!SETTLEMENT_TRANSITIONS[s.status].includes(to)) {
      throw businessRule(`Cannot move a settlement from ${s.status} to ${to}`);
    }
    if (to === 'PAID' && !input.reference && !s.reference) {
      throw businessRule('Enter the bank transfer / UTR reference before marking as paid');
    }
    await this.db.$transaction(async (tx) => {
      const updated = await tx.settlement.updateMany({
        where: { id, status: s.status },
        data: {
          status: to,
          reference: input.reference ?? undefined,
          notes: input.notes ?? undefined,
          ...(to === 'APPROVED' ? { approvedAt: new Date(), approvedById: actor?.auth?.userId ?? null } : {}),
          ...(to === 'PAID' ? { paidAt: new Date() } : {}),
        },
      });
      if (updated.count !== 1) throw conflict('Settlement changed in the meantime');
      await tx.settlementTransaction.create({
        data: {
          settlementId: id,
          fromStatus: s.status,
          toStatus: to,
          amount: s.amount,
          reference: input.reference ?? null,
          note: input.notes ?? null,
          actorId: actor?.auth?.userId ?? null,
        },
      });
      if (to === 'PAID') {
        await this.post(tx, [
          {
            sellerId: s.sellerId,
            type: 'SETTLEMENT_PAYOUT',
            amount: -toPaise(s.amount),
            description: `Payout ${s.settlementNumber}${input.reference ? ` (ref ${input.reference})` : ''}`,
            settlementId: s.id,
            actorId: actor?.auth?.userId,
          },
        ]);
      }
      await this.audit.record(
        actor,
        { action: `settlement.${to.toLowerCase()}`, entityType: 'Settlement', entityId: id, before: { status: s.status }, after: { status: to, ...input } },
        tx,
      );
    });
    await this.notifySettlement(id);
    return this.settlementDetail(id, { sellerId: null });
  }

  private async notifySettlement(id: string) {
    const s = await this.db.settlement.findUnique({ where: { id }, include: { seller: { select: { userId: true } } } });
    if (!s) return;
    await this.notifications.notify({
      key: 'settlement.updated',
      userId: s.seller.userId,
      link: '/seller/payouts',
      vars: {
        settlementNumber: s.settlementNumber,
        status: s.status.toLowerCase(),
        amount: `₹${num(s.amount).toFixed(2)}`,
        reference: s.reference ? `Reference: ${s.reference}` : '',
      },
    });
  }

  async listSettlements(scope: { sellerId: string | null }, q: { page: number; pageSize: number; status?: SettlementStatus; sellerId?: string }) {
    const where: Prisma.SettlementWhereInput = {
      ...(scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    const [items, total, sums] = await Promise.all([
      this.db.settlement.findMany({
        where,
        include: { seller: { select: { id: true, displayName: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.db.settlement.count({ where }),
      this.db.settlement.groupBy({ by: ['status'], where, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    return {
      ...paginated(items.map((s) => ({ ...s, amount: num(s.amount) })), total, q.page, q.pageSize),
      summary: Object.fromEntries(sums.map((s) => [s.status, { count: s._count._all, amount: num(s._sum.amount) }])),
    };
  }

  async settlementDetail(id: string, scope: { sellerId: string | null }) {
    const s = await this.db.settlement.findFirst({
      where: { id, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
      include: { transactions: { orderBy: { createdAt: 'asc' } }, seller: { select: { id: true, displayName: true, code: true } } },
    });
    if (!s) throw notFound('Settlement');
    return { ...s, amount: num(s.amount), transactions: s.transactions.map((t) => ({ ...t, amount: num(t.amount) })) };
  }

  /** Sellers with outstanding balances (admin payout planning). */
  async outstanding() {
    const rows = await this.db.sellerLedger.groupBy({ by: ['sellerId'], _sum: { amount: true } });
    const open = await this.db.settlement.groupBy({ by: ['sellerId'], where: { status: { in: OPEN_SETTLEMENT } }, _sum: { amount: true } });
    const sellers = await this.db.seller.findMany({
      where: { id: { in: rows.map((r) => r.sellerId) } },
      select: { id: true, displayName: true, code: true, status: true },
    });
    return rows
      .map((r) => {
        const balance = toPaise(r._sum.amount);
        const inSettlement = toPaise(open.find((o) => o.sellerId === r.sellerId)?._sum.amount);
        return {
          seller: sellers.find((s) => s.id === r.sellerId),
          balance: fromPaise(balance),
          inSettlement: fromPaise(inSettlement),
          available: fromPaise(Math.max(0, balance - inSettlement)),
        };
      })
      .filter((r) => r.balance !== 0)
      .sort((a, b) => b.available - a.available);
  }

  // ── Commission rules ───────────────────────────────────────
  async activeRules(db: Db = this.db): Promise<CommissionRuleLike[]> {
    const rules = await db.commissionRule.findMany({ where: { isActive: true } });
    return rules.map((r) => ({
      id: r.id,
      scope: r.scope,
      sellerId: r.sellerId,
      categoryId: r.categoryId,
      productId: r.productId,
      percentage: num(r.percentage),
      fixedAmount: toPaise(r.fixedAmount),
    }));
  }

  get defaultCommissionPercent() {
    return this.defaultCommission;
  }

  listRules(q: { scope?: string; sellerId?: string }) {
    return this.db.commissionRule.findMany({
      where: { ...(q.scope ? { scope: q.scope as never } : {}), ...(q.sellerId ? { sellerId: q.sellerId } : {}) },
      include: {
        seller: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
      },
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private ruleData(input: CommissionRuleInput) {
    return {
      scope: input.scope,
      sellerId: ['SELLER', 'SELLER_CATEGORY'].includes(input.scope) ? (input.sellerId ?? null) : null,
      categoryId: ['CATEGORY', 'SELLER_CATEGORY'].includes(input.scope) ? (input.categoryId ?? null) : null,
      productId: input.scope === 'PRODUCT' ? (input.productId ?? null) : null,
      percentage: input.percentage,
      fixedAmount: input.fixedAmount,
      isActive: input.isActive,
    };
  }

  async createRule(input: CommissionRuleInput, actor: AuditActor) {
    const data = this.ruleData(input);
    const dup = await this.db.commissionRule.findFirst({
      where: { scope: data.scope, sellerId: data.sellerId, categoryId: data.categoryId, productId: data.productId, isActive: true },
    });
    if (dup && data.isActive) throw conflict('An active rule already exists for this scope. Edit it instead.');
    const rule = await this.db.commissionRule.create({ data });
    await this.audit.record(actor, { action: 'commission.rule_create', entityType: 'CommissionRule', entityId: rule.id, after: rule });
    return rule;
  }

  async updateRule(id: string, input: CommissionRuleInput, actor: AuditActor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound('Commission rule');
    const rule = await this.db.commissionRule.update({ where: { id }, data: this.ruleData(input) });
    await this.audit.record(actor, { action: 'commission.rule_update', entityType: 'CommissionRule', entityId: id, before, after: rule });
    return rule;
  }

  async deleteRule(id: string, actor: AuditActor) {
    const before = await this.db.commissionRule.findUnique({ where: { id } });
    if (!before) throw notFound('Commission rule');
    await this.db.commissionRule.delete({ where: { id } });
    await this.audit.record(actor, { action: 'commission.rule_delete', entityType: 'CommissionRule', entityId: id, before });
  }

  async commissions(scope: { sellerId: string | null }, q: { page: number; pageSize: number; status?: string; sellerId?: string }) {
    const where: Prisma.CommissionWhereInput = {
      ...(scope.sellerId ? { sellerId: scope.sellerId } : q.sellerId ? { sellerId: q.sellerId } : {}),
      ...(q.status ? { status: q.status as never } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.commission.findMany({
        where,
        include: {
          orderItem: { select: { productName: true, sku: true, quantity: true, order: { select: { orderNumber: true } } } },
          seller: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.db.commission.count({ where }),
    ]);
    return paginated(
      items.map((c) => ({ ...c, baseAmount: num(c.baseAmount), rate: num(c.rate), amount: num(c.amount), taxAmount: num(c.taxAmount), fixedAmount: num(c.fixedAmount) })),
      total,
      q.page,
      q.pageSize,
    );
  }
}
