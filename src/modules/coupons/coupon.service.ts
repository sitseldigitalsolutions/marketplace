import type { Coupon, Prisma, PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { couponSchema } from '@vyora/shared';
import type { Db } from '../../database/prisma/client';
import { AppError, conflict, notFound } from '../../shared/errors';
import { decimal, num, toPaise } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { PricingCoupon } from '../orders/pricing';

type CouponInput = z.infer<typeof couponSchema>;

const invalid = (message: string) => new AppError(422, 'BUSINESS_RULE', message);

export class CouponService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  toPricing(c: Coupon): PricingCoupon {
    return {
      code: c.code,
      type: c.type,
      value: num(c.value),
      maxDiscount: c.maxDiscount === null ? null : toPaise(c.maxDiscount),
      minOrderAmount: toPaise(c.minOrderAmount),
      scope: c.scope,
      scopeIds: Array.isArray(c.scopeIds) ? (c.scopeIds as string[]) : [],
      fundedBy: c.fundedBy,
    };
  }

  /**
   * Validate that `code` can be used by this customer right now. Scope and minimum-order rules
   * are evaluated by the pricing engine against the actual cart lines.
   */
  async validate(code: string, userId: string | null, db: Db = this.db): Promise<Coupon> {
    const coupon = await db.coupon.findFirst({ where: { code: code.toUpperCase(), deletedAt: null } });
    if (!coupon || !coupon.isActive) throw invalid('This coupon code is not valid');
    const now = new Date();
    if (coupon.startsAt > now) throw invalid('This coupon is not active yet');
    if (coupon.endsAt < now) throw invalid('This coupon has expired');
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw invalid('This coupon has been fully redeemed');
    if (userId) {
      const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId, releasedAt: null } });
      if (used >= coupon.perCustomerLimit) throw invalid('You have already used this coupon');
      if (coupon.firstOrderOnly) {
        const orders = await db.order.count({ where: { customerId: userId, status: { not: 'CANCELLED' } } });
        if (orders > 0) throw invalid('This coupon is valid on your first order only');
      }
    } else if (coupon.firstOrderOnly || coupon.perCustomerLimit) {
      // Guests can preview the discount; limits are enforced again at checkout after sign-in.
    }
    return coupon;
  }

  /** Atomically claim one redemption; fails if the global usage limit was reached concurrently. */
  async redeem(tx: Db, coupon: Coupon, userId: string, orderId: string, discount: number) {
    const claimed = await tx.$executeRaw`
      UPDATE \`Coupon\` SET usedCount = usedCount + 1, updatedAt = NOW(3)
      WHERE id = ${coupon.id} AND (usageLimit IS NULL OR usedCount < usageLimit)`;
    if (claimed !== 1) throw conflict('This coupon has just been fully redeemed. Please remove it and try again.');
    await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId, discountAmount: decimal(discount) },
    });
  }

  /** Return a redemption when an entire order is cancelled. */
  async release(tx: Db, orderId: string) {
    const usage = await tx.couponUsage.findUnique({ where: { orderId } });
    if (!usage || usage.releasedAt) return;
    await tx.couponUsage.update({ where: { id: usage.id }, data: { releasedAt: new Date() } });
    await tx.$executeRaw`UPDATE \`Coupon\` SET usedCount = GREATEST(usedCount - 1, 0) WHERE id = ${usage.couponId}`;
  }

  /** Public list of currently redeemable coupons (shown at checkout). */
  async available() {
    const now = new Date();
    const rows = await this.db.coupon.findMany({
      where: { isActive: true, deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      take: 20,
    });
    return rows
      .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
      .map((c) => ({
        code: c.code,
        description: c.description,
        type: c.type,
        value: num(c.value),
        maxDiscount: c.maxDiscount === null ? null : num(c.maxDiscount),
        minOrderAmount: num(c.minOrderAmount),
        scope: c.scope,
        firstOrderOnly: c.firstOrderOnly,
        endsAt: c.endsAt,
      }));
  }

  // ── Admin ──────────────────────────────────────────────────
  async list(q: { page: number; pageSize: number; q?: string }) {
    const where: Prisma.CouponWhereInput = { deletedAt: null, ...(q.q ? { code: { contains: q.q.toUpperCase() } } : {}) };
    const [items, total] = await Promise.all([
      this.db.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q.page, q.pageSize) }),
      this.db.coupon.count({ where }),
    ]);
    return paginated(
      items.map((c) => ({ ...c, value: num(c.value), maxDiscount: c.maxDiscount === null ? null : num(c.maxDiscount), minOrderAmount: num(c.minOrderAmount) })),
      total,
      q.page,
      q.pageSize,
    );
  }

  private data(input: CouponInput) {
    return {
      code: input.code,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      maxDiscount: input.maxDiscount ?? null,
      minOrderAmount: input.minOrderAmount,
      scope: input.scope,
      scopeIds: input.scope === 'ALL' ? [] : input.scopeIds,
      fundedBy: input.fundedBy,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit,
      firstOrderOnly: input.firstOrderOnly,
      isActive: input.isActive,
    };
  }

  async create(input: CouponInput, actor: AuditActor) {
    if (await this.db.coupon.findUnique({ where: { code: input.code } })) throw conflict('A coupon with this code already exists');
    const c = await this.db.coupon.create({ data: this.data(input) });
    await this.audit.record(actor, { action: 'coupon.create', entityType: 'Coupon', entityId: c.id, after: c });
    return c;
  }

  async update(id: string, input: CouponInput, actor: AuditActor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('Coupon');
    const c = await this.db.coupon.update({ where: { id }, data: this.data(input) });
    await this.audit.record(actor, { action: 'coupon.update', entityType: 'Coupon', entityId: id, before, after: c });
    return c;
  }

  async remove(id: string, actor: AuditActor) {
    const before = await this.db.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('Coupon');
    await this.db.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, code: `${before.code}~${Date.now().toString(36)}`.slice(0, 40) },
    });
    await this.audit.record(actor, { action: 'coupon.delete', entityType: 'Coupon', entityId: id, before });
  }

  async usages(id: string, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.db.couponUsage.findMany({
        where: { couponId: id },
        include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true, grandTotal: true } } },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(page, pageSize),
      }),
      this.db.couponUsage.count({ where: { couponId: id } }),
    ]);
    return paginated(items, total, page, pageSize);
  }
}
