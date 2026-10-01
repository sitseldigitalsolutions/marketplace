import type { Prisma, PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { attributeSchema, brandSchema, categorySchema } from '@vyora/shared';
import type { CacheProvider } from '../../infrastructure/cache';
import { businessRule, conflict, notFound } from '../../shared/errors';
import { slugify } from '../../shared/text';
import type { AuditActor, AuditService } from '../audit/audit.service';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  parentId: string | null;
  productCount?: number;
  children: CategoryNode[];
}

type CategoryInput = z.infer<typeof categorySchema>;
type BrandInput = z.infer<typeof brandSchema>;
type AttributeInput = z.infer<typeof attributeSchema>;

export class CatalogService {
  constructor(
    private readonly db: PrismaClient,
    private readonly cache: CacheProvider,
    private readonly audit: AuditService,
  ) {}

  private async uniqueSlug(model: 'category' | 'brand', base: string, excludeId?: string) {
    const root = slugify(base) || 'item';
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`;
      const existing =
        model === 'category'
          ? await this.db.category.findUnique({ where: { slug }, select: { id: true } })
          : await this.db.brand.findUnique({ where: { slug }, select: { id: true } });
      if (!existing || existing.id === excludeId) return slug;
    }
    return `${root}-${Date.now().toString(36)}`;
  }

  // ── Categories ─────────────────────────────────────────────
  async tree(opts: { includeInactive?: boolean } = {}): Promise<CategoryNode[]> {
    const key = `categories:tree:${opts.includeInactive ? 'all' : 'active'}`;
    const cached = await this.cache.get<CategoryNode[]>(key);
    if (cached) return cached;
    const rows = await this.db.category.findMany({
      where: { deletedAt: null, ...(opts.includeInactive ? {} : { isActive: true }) },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.db.product.groupBy({
      by: ['categoryId'],
      where: { status: 'APPROVED', deletedAt: null, minPrice: { not: null } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const nodes = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];
    for (const r of rows) {
      nodes.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        imageUrl: r.imageUrl,
        description: r.description,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        depth: r.depth,
        parentId: r.parentId,
        productCount: countMap.get(r.id) ?? 0,
        children: [],
      });
    }
    for (const n of nodes.values()) {
      if (n.parentId && nodes.has(n.parentId)) nodes.get(n.parentId)!.children.push(n);
      else if (!n.parentId) roots.push(n);
    }
    // Roll product counts up the tree.
    const roll = (n: CategoryNode): number => {
      n.productCount = (n.productCount ?? 0) + n.children.reduce((s, c) => s + roll(c), 0);
      return n.productCount;
    };
    roots.forEach(roll);
    await this.cache.set(key, roots, 300);
    return roots;
  }

  async bySlug(slug: string) {
    const cat = await this.db.category.findFirst({ where: { slug, deletedAt: null, isActive: true } });
    if (!cat) throw notFound('Category');
    const ancestorIds = cat.path.split('/').filter((id) => id && id !== cat.id);
    const [ancestors, children, attributes] = await Promise.all([
      this.db.category.findMany({ where: { id: { in: ancestorIds } }, select: { id: true, name: true, slug: true, depth: true } }),
      this.db.category.findMany({
        where: { parentId: cat.id, deletedAt: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true, icon: true, imageUrl: true },
      }),
      this.filterableAttributes(cat.id),
    ]);
    return {
      ...cat,
      breadcrumbs: [...ancestors.sort((a, b) => a.depth - b.depth), { id: cat.id, name: cat.name, slug: cat.slug, depth: cat.depth }],
      children,
      attributes,
    };
  }

  /** Category IDs of the category and all its descendants. */
  async subtreeIds(categoryId: string): Promise<string[]> {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    if (!cat) return [];
    const rows = await this.db.category.findMany({
      where: { path: { startsWith: cat.path }, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Attributes applicable to a category: global ones plus those defined on the category or its ancestors. */
  async filterableAttributes(categoryId: string) {
    const cat = await this.db.category.findUnique({ where: { id: categoryId }, select: { path: true } });
    const lineage = cat ? cat.path.split('/').filter(Boolean) : [];
    return this.db.productAttribute.findMany({
      where: { OR: [{ categoryId: null }, { categoryId: { in: lineage } }] },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(input: CategoryInput, actor: AuditActor) {
    const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
    if (input.parentId && !parent) throw notFound('Parent category');
    const slug = input.slug ?? (await this.uniqueSlug('category', input.name));
    if (input.slug && (await this.db.category.findUnique({ where: { slug } }))) throw conflict('Slug is already in use');
    const created = await this.db.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: {
          name: input.name,
          slug,
          parentId: parent?.id ?? null,
          depth: parent ? parent.depth + 1 : 0,
          path: '/',
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          icon: input.icon ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
      const updated = await tx.category.update({ where: { id: c.id }, data: { path: `${parent?.path ?? '/'}${c.id}/` } });
      await this.applyCategoryConfig(tx, c.id, input);
      await this.audit.record(actor, { action: 'category.create', entityType: 'Category', entityId: c.id, after: updated }, tx);
      return updated;
    });
    await this.cache.delPrefix('categories:');
    await this.cache.delPrefix('home:');
    return created;
  }

  /** Category-level commission and tax overrides are stored in their own tables. */
  private async applyCategoryConfig(tx: Prisma.TransactionClient, categoryId: string, input: CategoryInput) {
    if (input.commissionPercent !== undefined) {
      await tx.commissionRule.deleteMany({ where: { scope: 'CATEGORY', categoryId } });
      if (input.commissionPercent !== null) {
        await tx.commissionRule.create({ data: { scope: 'CATEGORY', categoryId, percentage: input.commissionPercent } });
      }
    }
    if (input.taxRate !== undefined) {
      await tx.taxConfiguration.deleteMany({ where: { categoryId } });
      if (input.taxRate !== null) {
        await tx.taxConfiguration.create({ data: { name: `GST ${input.taxRate}%`, categoryId, rate: input.taxRate } });
      }
    }
  }

  async updateCategory(id: string, input: Partial<CategoryInput>, actor: AuditActor) {
    const before = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('Category');
    if (input.slug && input.slug !== before.slug && (await this.db.category.findUnique({ where: { slug: input.slug } }))) {
      throw conflict('Slug is already in use');
    }
    let parentChange: { parentId: string | null; path: string; depth: number } | null = null;
    if (input.parentId !== undefined && input.parentId !== before.parentId) {
      const parent = input.parentId ? await this.db.category.findFirst({ where: { id: input.parentId, deletedAt: null } }) : null;
      if (input.parentId && !parent) throw notFound('Parent category');
      if (parent && parent.path.startsWith(before.path)) throw businessRule('A category cannot be moved under its own subtree');
      parentChange = {
        parentId: parent?.id ?? null,
        path: `${parent?.path ?? '/'}${before.id}/`,
        depth: parent ? parent.depth + 1 : 0,
      };
    }
    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          imageUrl: input.imageUrl,
          icon: input.icon,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          ...(parentChange ?? {}),
        },
      });
      if (parentChange) {
        // Re-root descendants' materialised paths.
        const descendants = await tx.category.findMany({ where: { path: { startsWith: before.path }, NOT: { id } } });
        const depthDelta = parentChange.depth - before.depth;
        for (const d of descendants) {
          await tx.category.update({
            where: { id: d.id },
            data: { path: parentChange.path + d.path.slice(before.path.length), depth: d.depth + depthDelta },
          });
        }
      }
      await this.applyCategoryConfig(tx, id, input as CategoryInput);
      await this.audit.record(actor, { action: 'category.update', entityType: 'Category', entityId: id, before, after: u }, tx);
      return u;
    });
    await this.cache.delPrefix('categories:');
    await this.cache.delPrefix('home:');
    return updated;
  }

  async deleteCategory(id: string, actor: AuditActor) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound('Category');
    const [children, products] = await Promise.all([
      this.db.category.count({ where: { parentId: id, deletedAt: null } }),
      this.db.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    if (children > 0) throw businessRule('Move or delete the sub-categories first');
    if (products > 0) throw businessRule(`This category still has ${products} product(s). Move them before deleting.`);
    await this.db.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, slug: `${cat.slug}-deleted-${Date.now().toString(36)}` },
    });
    await this.audit.record(actor, { action: 'category.delete', entityType: 'Category', entityId: id, before: cat });
    await this.cache.delPrefix('categories:');
  }

  async reorderCategories(items: Array<{ id: string; sortOrder: number }>, actor: AuditActor) {
    await this.db.$transaction(items.map((i) => this.db.category.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } })));
    await this.audit.record(actor, { action: 'category.reorder', entityType: 'Category', metadata: items });
    await this.cache.delPrefix('categories:');
  }

  async categoryAdminDetail(id: string) {
    const cat = await this.db.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw notFound('Category');
    const [commission, tax] = await Promise.all([
      this.db.commissionRule.findFirst({ where: { scope: 'CATEGORY', categoryId: id, isActive: true } }),
      this.db.taxConfiguration.findFirst({ where: { categoryId: id, isActive: true } }),
    ]);
    return { ...cat, commissionPercent: commission ? Number(commission.percentage) : null, taxRate: tax ? Number(tax.rate) : null };
  }

  // ── Brands ─────────────────────────────────────────────────
  async listBrands(opts: { q?: string; includeInactive?: boolean; categoryId?: string } = {}) {
    return this.db.brand.findMany({
      where: {
        deletedAt: null,
        ...(opts.includeInactive ? {} : { isActive: true }),
        ...(opts.q ? { name: { contains: opts.q } } : {}),
        ...(opts.categoryId
          ? { products: { some: { categoryId: { in: await this.subtreeIds(opts.categoryId) }, status: 'APPROVED', deletedAt: null } } }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  async createBrand(input: BrandInput, actor: AuditActor) {
    const slug = input.slug ?? (await this.uniqueSlug('brand', input.name));
    const brand = await this.db.brand.create({
      data: { name: input.name, slug, logoUrl: input.logoUrl ?? null, description: input.description ?? null, isActive: input.isActive },
    });
    await this.audit.record(actor, { action: 'brand.create', entityType: 'Brand', entityId: brand.id, after: brand });
    return brand;
  }

  async updateBrand(id: string, input: Partial<BrandInput>, actor: AuditActor) {
    const before = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('Brand');
    const brand = await this.db.brand.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: 'brand.update', entityType: 'Brand', entityId: id, before, after: brand });
    return brand;
  }

  async deleteBrand(id: string, actor: AuditActor) {
    const brand = await this.db.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw notFound('Brand');
    const inUse = await this.db.product.count({ where: { brandId: id, deletedAt: null } });
    if (inUse) throw businessRule(`This brand is used by ${inUse} product(s)`);
    await this.db.brand.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, slug: `${brand.slug}-deleted-${Date.now().toString(36)}` } });
    await this.audit.record(actor, { action: 'brand.delete', entityType: 'Brand', entityId: id, before: brand });
  }

  // ── Attributes ─────────────────────────────────────────────
  listAttributes(categoryId?: string) {
    return this.db.productAttribute.findMany({
      where: categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {},
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createAttribute(input: AttributeInput, actor: AuditActor) {
    const attr = await this.db.productAttribute.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        categoryId: input.categoryId ?? null,
        options: input.options,
        isFilterable: input.isFilterable,
        isVariantAxis: input.isVariantAxis,
        isRequired: input.isRequired,
      },
    });
    await this.audit.record(actor, { action: 'attribute.create', entityType: 'ProductAttribute', entityId: attr.id, after: attr });
    return attr;
  }

  async updateAttribute(id: string, input: Partial<AttributeInput>, actor: AuditActor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound('Attribute');
    const attr = await this.db.productAttribute.update({
      where: { id },
      data: { ...input, options: input.options ?? undefined },
    });
    await this.audit.record(actor, { action: 'attribute.update', entityType: 'ProductAttribute', entityId: id, before, after: attr });
    return attr;
  }

  async deleteAttribute(id: string, actor: AuditActor) {
    const before = await this.db.productAttribute.findUnique({ where: { id } });
    if (!before) throw notFound('Attribute');
    await this.db.productAttribute.delete({ where: { id } });
    await this.audit.record(actor, { action: 'attribute.delete', entityType: 'ProductAttribute', entityId: id, before });
  }
}
