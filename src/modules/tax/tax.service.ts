import type { PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { taxConfigSchema } from '@vyora/shared';
import { notFound } from '../../shared/errors';
import { num } from '../../shared/money';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { SettingsService } from '../settings/settings.service';

/** GST rates by category. The nearest category (or ancestor) with a rate wins, then the default. */
export class TaxService {
  constructor(
    private readonly db: PrismaClient,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Map each categoryId → { rate, lineage (nearest first) }. */
  async resolve(categoryIds: string[]) {
    const unique = [...new Set(categoryIds)];
    const cats = await this.db.category.findMany({ where: { id: { in: unique } }, select: { id: true, path: true } });
    const lineages = new Map(cats.map((c) => [c.id, c.path.split('/').filter(Boolean).reverse()]));
    const allIds = [...new Set([...lineages.values()].flat())];
    const [configs, taxSettings] = await Promise.all([
      this.db.taxConfiguration.findMany({ where: { isActive: true, OR: [{ categoryId: { in: allIds } }, { categoryId: null }] } }),
      this.settings.get('tax'),
    ]);
    const byCat = new Map(configs.filter((c) => c.categoryId).map((c) => [c.categoryId!, num(c.rate)]));
    const fallback = configs.find((c) => c.categoryId === null);
    const defaultRate = fallback ? num(fallback.rate) : taxSettings.defaultRate;
    const out = new Map<string, { rate: number; lineage: string[] }>();
    for (const id of unique) {
      const lineage = lineages.get(id) ?? [id];
      const hit = lineage.find((c) => byCat.has(c));
      out.set(id, { rate: hit ? byCat.get(hit)! : defaultRate, lineage });
    }
    return { rates: out, inclusive: taxSettings.pricesInclusive };
  }

  list() {
    return this.db.taxConfiguration.findMany({ include: { category: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async create(input: z.infer<typeof taxConfigSchema>, actor: AuditActor) {
    const row = await this.db.taxConfiguration.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'tax.create', entityType: 'TaxConfiguration', entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: z.infer<typeof taxConfigSchema>, actor: AuditActor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound('Tax configuration');
    const row = await this.db.taxConfiguration.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'tax.update', entityType: 'TaxConfiguration', entityId: id, before, after: row });
    return row;
  }

  async remove(id: string, actor: AuditActor) {
    const before = await this.db.taxConfiguration.findUnique({ where: { id } });
    if (!before) throw notFound('Tax configuration');
    await this.db.taxConfiguration.delete({ where: { id } });
    await this.audit.record(actor, { action: 'tax.delete', entityType: 'TaxConfiguration', entityId: id, before });
  }
}
