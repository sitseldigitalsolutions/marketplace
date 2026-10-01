import type { PrismaClient, ShippingMethod } from '@prisma/client';
import type { z } from 'zod';
import type { pincodeSchemaInput, shippingConfigSchema } from '@vyora/shared';
import { businessRule, notFound } from '../../shared/errors';
import { num, toPaise } from '../../shared/money';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { ShippingRule } from '../orders/pricing';
import type { SettingsService } from '../settings/settings.service';

/**
 * Shipping provider contract for carrier integrations (Shiprocket, Delhivery, …).
 * The built-in `manual` provider lets sellers/admins enter carrier + tracking details by hand.
 */
export interface ShippingProvider {
  readonly name: string;
  createShipment?(input: { subOrderNumber: string; weightGrams: number; pickupPincode: string; deliveryPincode: string }): Promise<{
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
  }>;
  track?(trackingNumber: string): Promise<Array<{ status: string; location?: string; occurredAt: Date }>>;
}

export class ManualShippingProvider implements ShippingProvider {
  readonly name = 'manual';
}

const DEFAULTS: Record<ShippingMethod, { label: string; baseFee: number; freeAbove: number | null; minDays: number; maxDays: number }> = {
  STANDARD: { label: 'Standard delivery', baseFee: 40, freeAbove: 499, minDays: 3, maxDays: 7 },
  EXPRESS: { label: 'Express delivery', baseFee: 99, freeAbove: null, minDays: 1, maxDays: 3 },
};

export class ShippingService {
  readonly provider: ShippingProvider = new ManualShippingProvider();

  constructor(
    private readonly db: PrismaClient,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async methods() {
    const rows = await this.db.shippingConfiguration.findMany({ orderBy: { baseFee: 'asc' } });
    const byMethod = new Map(rows.map((r) => [r.method, r]));
    return (Object.keys(DEFAULTS) as ShippingMethod[]).map((m) => {
      const r = byMethod.get(m);
      return r
        ? { method: m, label: r.label, baseFee: num(r.baseFee), freeAbove: r.freeAbove === null ? null : num(r.freeAbove), minDays: r.minDays, maxDays: r.maxDays, isActive: r.isActive }
        : { method: m, ...DEFAULTS[m], isActive: true };
    });
  }

  async rule(method: ShippingMethod): Promise<ShippingRule & { minDays: number; maxDays: number; label: string }> {
    const m = (await this.methods()).find((x) => x.method === method);
    if (!m || !m.isActive) throw businessRule('This shipping method is not available');
    return {
      baseFee: toPaise(m.baseFee),
      freeAbove: m.freeAbove === null ? null : toPaise(m.freeAbove),
      minDays: m.minDays,
      maxDays: m.maxDays,
      label: m.label,
    };
  }

  /**
   * Delivery eligibility for a PIN code. If no serviceability rows are configured, every valid
   * PIN is serviceable. Estimates are indicative ranges, never guaranteed dates.
   */
  async checkPincode(pincode: string, method: ShippingMethod = 'STANDARD') {
    const [configured, row, cod, rule] = await Promise.all([
      this.db.serviceablePincode.count(),
      this.db.serviceablePincode.findUnique({ where: { pincode } }),
      this.settings.get('cod'),
      this.rule(method).catch(() => null),
    ]);
    const serviceable = configured === 0 ? true : Boolean(row?.isServiceable);
    const extra = row?.extraDays ?? 0;
    const now = new Date();
    const addDays = (d: number) => {
      const x = new Date(now);
      x.setUTCDate(x.getUTCDate() + d);
      return x;
    };
    return {
      pincode,
      serviceable,
      codAvailable: serviceable && cod.enabled && (row ? row.codAvailable : true),
      city: row?.city ?? null,
      state: row?.state ?? null,
      estimate:
        serviceable && rule
          ? { minDays: rule.minDays + extra, maxDays: rule.maxDays + extra, from: addDays(rule.minDays + extra), to: addDays(rule.maxDays + extra) }
          : null,
    };
  }

  // ── Admin configuration ────────────────────────────────────
  async upsertMethod(input: z.infer<typeof shippingConfigSchema>, actor: AuditActor) {
    if (input.maxDays < input.minDays) throw businessRule('Maximum days must be at least the minimum days');
    const row = await this.db.shippingConfiguration.upsert({
      where: { method: input.method },
      create: { ...input, freeAbove: input.freeAbove ?? null },
      update: { ...input, freeAbove: input.freeAbove ?? null },
    });
    await this.audit.record(actor, { action: 'shipping.config', entityType: 'ShippingConfiguration', entityId: row.id, after: input });
    return row;
  }

  listPincodes(q?: string) {
    return this.db.serviceablePincode.findMany({
      where: q ? { pincode: { startsWith: q } } : {},
      orderBy: { pincode: 'asc' },
      take: 500,
    });
  }

  async upsertPincode(input: z.infer<typeof pincodeSchemaInput>, actor: AuditActor) {
    const row = await this.db.serviceablePincode.upsert({ where: { pincode: input.pincode }, create: input, update: input });
    await this.audit.record(actor, { action: 'shipping.pincode', entityType: 'ServiceablePincode', entityId: row.id, after: input });
    return row;
  }

  async deletePincode(id: string, actor: AuditActor) {
    const row = await this.db.serviceablePincode.findUnique({ where: { id } });
    if (!row) throw notFound('PIN code');
    await this.db.serviceablePincode.delete({ where: { id } });
    await this.audit.record(actor, { action: 'shipping.pincode_delete', entityType: 'ServiceablePincode', entityId: id, before: row });
  }
}
