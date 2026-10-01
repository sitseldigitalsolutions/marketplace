import { Prisma, type PrismaClient } from '@prisma/client';
import type { ProductListQuery } from '@vyora/shared';
import type { CacheProvider } from '../../infrastructure/cache';
import { notFound } from '../../shared/errors';
import { num } from '../../shared/money';
import { paginated } from '../../shared/pagination';
import { normalizeQuery } from '../../shared/text';
import type { CatalogService } from './category.service';
import { purchasableListingWhere } from './product-indexer';

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  minPrice: true,
  maxMrp: true,
  maxDiscountPct: true,
  inStock: true,
  ratingAvg: true,
  ratingCount: true,
  soldCount: true,
  isFeatured: true,
  publishedAt: true,
  codAvailable: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' }, take: 2, select: { url: true, storageKey: true, alt: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export const thumbOf = (img: { url: string; storageKey: string | null } | undefined) =>
  img ? (img.storageKey && img.url.endsWith('.webp') ? img.url.replace(/\.webp$/, '-sm.webp') : img.url) : null;

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'you', 'are', 'was', 'this', 'that']);

/** Build a MySQL boolean-mode query: every meaningful token must match (as a prefix). */
export function booleanQuery(q: string): string | null {
  const tokens = normalizeQuery(q)
    .replace(/[+\-><()~*"@]/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return tokens.length ? tokens.map((t) => `+${t}*`).join(' ') : null;
}

export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  hoverImageUrl: string | null;
  price: number;
  mrp: number;
  discountPct: number;
  rating: number;
  ratingCount: number;
  inStock: boolean;
  codAvailable: boolean;
  badges: string[];
  /** Cheapest in-stock purchasable offer on the default variant, for quick add-to-cart. */
  quickAddListingId: string | null;
}

export class StorefrontService {
  constructor(
    private readonly db: PrismaClient,
    private readonly catalog: CatalogService,
    private readonly cache: CacheProvider,
  ) {}

  /** Base filter: approved, live products with at least one purchasable offer. */
  private liveWhere(): Prisma.ProductWhereInput {
    return { status: 'APPROVED', deletedAt: null, minPrice: { not: null } };
  }

  async toCards(rows: CardRow[]): Promise<ProductCard[]> {
    if (!rows.length) return [];
    const listings = await this.db.sellerProductListing.findMany({
      where: { productId: { in: rows.map((r) => r.id) }, ...purchasableListingWhere },
      select: { id: true, productId: true, price: true, variant: { select: { isDefault: true } }, inventory: { select: { quantity: true, reserved: true } } },
      orderBy: { price: 'asc' },
    });
    const quick = new Map<string, { id: string; variants: number }>();
    const variantCount = new Map<string, Set<boolean>>();
    for (const l of listings) {
      const avail = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
      if (!variantCount.has(l.productId)) variantCount.set(l.productId, new Set());
      variantCount.get(l.productId)!.add(l.variant.isDefault);
      if (avail > 0 && !quick.has(l.productId)) quick.set(l.productId, { id: l.id, variants: 0 });
    }
    const weekAgo = Date.now() - 14 * 86400_000;
    return rows.map((r) => {
      const price = num(r.minPrice);
      const mrp = Math.max(num(r.maxMrp), price);
      const badges: string[] = [];
      if (r.isFeatured) badges.push('Featured');
      if (r.publishedAt && r.publishedAt.getTime() > weekAgo) badges.push('New');
      if (r.soldCount >= 20) badges.push('Bestseller');
      if (r.maxDiscountPct >= 30) badges.push('Hot deal');
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        brand: r.brand?.name ?? null,
        category: r.category.name,
        imageUrl: r.images[0]?.url ?? null,
        thumbUrl: thumbOf(r.images[0]),
        hoverImageUrl: r.images[1]?.url ?? null,
        price,
        mrp,
        discountPct: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
        rating: num(r.ratingAvg),
        ratingCount: r.ratingCount,
        inStock: r.inStock,
        codAvailable: r.codAvailable,
        badges,
        quickAddListingId: quick.get(r.id)?.id ?? null,
      };
    });
  }

  private async fulltextIds(q: string): Promise<Map<string, number>> {
    const bq = booleanQuery(q);
    const ranks = new Map<string, number>();
    if (bq) {
      const rows = await this.db.$queryRaw<Array<{ id: string; score: number }>>`
        SELECT id, MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE) AS score
        FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND MATCH(title, searchText) AGAINST (${bq} IN BOOLEAN MODE)
        ORDER BY score DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 100000 - i));
    }
    if (ranks.size === 0) {
      // Short or unusual terms: fall back to substring matching.
      const like = `%${normalizeQuery(q).replace(/[%_\\]/g, '')}%`;
      const rows = await this.db.$queryRaw<Array<{ id: string; titleHit: number }>>`
        SELECT id, (title LIKE ${like}) AS titleHit FROM \`Product\`
        WHERE status = 'APPROVED' AND deletedAt IS NULL AND minPrice IS NOT NULL
          AND (title LIKE ${like} OR searchText LIKE ${like})
        ORDER BY titleHit DESC, soldCount DESC LIMIT 2000`;
      rows.forEach((r, i) => ranks.set(r.id, 100000 - i));
    }
    return ranks;
  }

  /** Product listing / search with filters, sorting, pagination and facets. */
  async list(query: ProductListQuery, opts: { facets?: boolean } = {}) {
    const where: Prisma.ProductWhereInput = this.liveWhere();
    const and: Prisma.ProductWhereInput[] = [];
    let category: Awaited<ReturnType<CatalogService['bySlug']>> | null = null;

    if (query.category) {
      category = await this.catalog.bySlug(query.category);
      and.push({ categoryId: { in: await this.catalog.subtreeIds(category.id) } });
    }
    let ranks: Map<string, number> | null = null;
    if (query.q) {
      ranks = await this.fulltextIds(query.q);
      and.push({ id: { in: [...ranks.keys()] } });
    }
    const baseWhere: Prisma.ProductWhereInput = { ...where, AND: [...and] };

    if (query.brand) and.push({ brand: { slug: { in: query.brand.split(',').map((s) => s.trim()).filter(Boolean) } } });
    if (query.seller) and.push({ listings: { some: { ...purchasableListingWhere, seller: { slug: query.seller, status: 'APPROVED' } } } });
    if (query.minPrice !== undefined) and.push({ minPrice: { gte: query.minPrice } });
    if (query.maxPrice !== undefined) and.push({ minPrice: { lte: query.maxPrice } });
    if (query.rating) and.push({ ratingAvg: { gte: query.rating } });
    if (query.inStock) and.push({ inStock: true });
    if (query.onSale) and.push({ maxDiscountPct: { gte: 10 } });
    if (query.attrs) {
      for (const part of query.attrs.split(';')) {
        const [code, raw] = part.split(':');
        const values = (raw ?? '').split('|').map((v) => v.trim()).filter(Boolean);
        if (code && values.length) {
          and.push({ attributeValues: { some: { attribute: { code: code.trim() }, value: { in: values } } } });
        }
      }
    }
    const fullWhere: Prisma.ProductWhereInput = { ...where, AND: and };

    const sort = query.sort ?? (query.q ? 'relevance' : 'popular');
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === 'newest'
        ? [{ publishedAt: 'desc' }]
        : sort === 'price_asc'
          ? [{ minPrice: 'asc' }]
          : sort === 'price_desc'
            ? [{ minPrice: 'desc' }]
            : sort === 'rating'
              ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]
              : sort === 'discount'
                ? [{ maxDiscountPct: 'desc' }]
                : [{ inStock: 'desc' }, { soldCount: 'desc' }, { ratingCount: 'desc' }, { publishedAt: 'desc' }];

    let rows: CardRow[];
    let total: number;
    if (sort === 'relevance' && ranks) {
      // Rank in application code (MySQL relevance is not expressible via Prisma orderBy).
      const matching = await this.db.product.findMany({ where: fullWhere, select: { id: true, inStock: true } });
      matching.sort((a, b) => Number(b.inStock) - Number(a.inStock) || (ranks!.get(b.id) ?? 0) - (ranks!.get(a.id) ?? 0));
      total = matching.length;
      const pageIds = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((m) => m.id);
      const found = await this.db.product.findMany({ where: { id: { in: pageIds } }, select: cardSelect });
      rows = pageIds.map((id) => found.find((f) => f.id === id)!).filter(Boolean);
    } else {
      [rows, total] = await Promise.all([
        this.db.product.findMany({
          where: fullWhere,
          select: cardSelect,
          orderBy,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.product.count({ where: fullWhere }),
      ]);
    }
    const result = paginated(await this.toCards(rows), total, query.page, query.pageSize);
    return {
      ...result,
      category: category
        ? { id: category.id, name: category.name, slug: category.slug, description: category.description, breadcrumbs: category.breadcrumbs, children: category.children }
        : null,
      facets: opts.facets ? await this.facets(baseWhere, category?.id ?? null) : undefined,
    };
  }

  private async facets(baseWhere: Prisma.ProductWhereInput, categoryId: string | null) {
    const base = await this.db.product.findMany({ where: baseWhere, select: { id: true, brandId: true }, take: 5000 });
    const ids = base.map((b) => b.id);
    if (!ids.length) return { brands: [], price: { min: 0, max: 0 }, attributes: [] };
    const [brandCounts, priceAgg, attrValues, attrs] = await Promise.all([
      this.db.product.groupBy({ by: ['brandId'], where: { id: { in: ids }, brandId: { not: null } }, _count: { _all: true } }),
      this.db.product.aggregate({ where: { id: { in: ids } }, _min: { minPrice: true }, _max: { minPrice: true } }),
      this.db.productAttributeValue.groupBy({
        by: ['attributeId', 'value'],
        where: { productId: { in: ids } },
        _count: { productId: true },
      }),
      categoryId ? this.catalog.filterableAttributes(categoryId) : this.db.productAttribute.findMany({ where: { isFilterable: true } }),
    ]);
    const brands = await this.db.brand.findMany({
      where: { id: { in: brandCounts.map((b) => b.brandId!).filter(Boolean) } },
      select: { id: true, name: true, slug: true },
    });
    return {
      brands: brandCounts
        .map((b) => ({ ...brands.find((x) => x.id === b.brandId)!, count: b._count._all }))
        .filter((b) => b.slug)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
      price: { min: Math.floor(num(priceAgg._min.minPrice)), max: Math.ceil(num(priceAgg._max.minPrice)) },
      attributes: attrs
        .filter((a) => a.isFilterable)
        .map((a) => ({
          code: a.code,
          name: a.name,
          values: attrValues
            .filter((v) => v.attributeId === a.id)
            .map((v) => ({ value: v.value, count: v._count.productId }))
            .sort((x, y) => y.count - x.count)
            .slice(0, 20),
        }))
        .filter((a) => a.values.length > 0),
    };
  }

  /** Full product page: variants, offers from every seller, specs, breadcrumbs, related items. */
  async detail(slug: string) {
    const product = await this.db.product.findFirst({
      where: { slug, deletedAt: null, status: 'APPROVED' },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, path: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        attributeValues: { where: { variantId: null }, include: { attribute: { select: { name: true, code: true } } } },
      },
    });
    if (!product) throw notFound('Product');

    const [offers, ancestors, ratingBreakdown] = await Promise.all([
      this.db.sellerProductListing.findMany({
        where: { productId: product.id, ...purchasableListingWhere },
        include: {
          inventory: { select: { quantity: true, reserved: true } },
          seller: { select: { id: true, displayName: true, slug: true, ratingAvg: true, ratingCount: true, fulfillmentMode: true, createdAt: true } },
        },
        orderBy: { price: 'asc' },
      }),
      this.db.category.findMany({
        where: { id: { in: product.category.path.split('/').filter(Boolean) } },
        select: { id: true, name: true, slug: true, depth: true },
        orderBy: { depth: 'asc' },
      }),
      this.db.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, status: 'APPROVED', deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    // Axes (e.g. color, size) derived from variant options, for the variant picker.
    const axes = new Map<string, Set<string>>();
    for (const v of product.variants) {
      for (const [k, val] of Object.entries((v.options ?? {}) as Record<string, string>)) {
        if (!axes.has(k)) axes.set(k, new Set());
        axes.get(k)!.add(val);
      }
    }

    void this.db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      highlights: (product.highlights ?? []) as string[],
      specifications: (product.specifications ?? []) as Array<{ key: string; value: string }>,
      attributes: product.attributeValues.map((a) => ({ name: a.attribute.name, code: a.attribute.code, value: a.value })),
      brand: product.brand,
      category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
      breadcrumbs: ancestors,
      images: product.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: thumbOf(i), alt: i.alt, variantId: i.variantId })),
      videoUrl: product.videoUrl,
      rating: num(product.ratingAvg),
      ratingCount: product.ratingCount,
      ratingBreakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: ratingBreakdown.find((r) => r.rating === star)?._count._all ?? 0 })),
      soldCount: product.soldCount,
      isReturnable: product.isReturnable,
      returnWindowDays: product.returnWindowDays,
      codAvailable: product.codAvailable,
      price: num(product.minPrice),
      mrp: num(product.maxMrp),
      inStock: product.inStock,
      axes: [...axes.entries()].map(([code, values]) => ({ code, values: [...values] })),
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, options: v.options as Record<string, string>, isDefault: v.isDefault })),
      offers: offers.map((o) => {
        const available = (o.inventory?.quantity ?? 0) - (o.inventory?.reserved ?? 0);
        return {
          listingId: o.id,
          variantId: o.variantId,
          sku: o.sku,
          price: num(o.price),
          mrp: num(o.mrp),
          discountPct: num(o.mrp) > num(o.price) ? Math.round(((num(o.mrp) - num(o.price)) / num(o.mrp)) * 100) : 0,
          available: Math.max(0, available),
          inStock: available > 0,
          lowStock: available > 0 && available <= 5,
          seller: {
            id: o.seller.id,
            name: o.seller.displayName,
            slug: o.seller.slug,
            rating: num(o.seller.ratingAvg),
            ratingCount: o.seller.ratingCount,
            fulfilledBy: o.seller.fulfillmentMode,
            since: o.seller.createdAt,
          },
        };
      }),
      seo: {
        title: `${product.title}${product.brand ? ` | ${product.brand.name}` : ''}`,
        description: product.description.slice(0, 160),
      },
    };
  }

  async related(productId: string, limit = 12) {
    const p = await this.db.product.findUnique({ where: { id: productId }, select: { categoryId: true, brandId: true } });
    if (!p) return [];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), categoryId: p.categoryId, NOT: { id: productId } },
      select: cardSelect,
      orderBy: [{ soldCount: 'desc' }, { ratingAvg: 'desc' }],
      take: limit,
    });
    return this.toCards(rows);
  }

  /** Products most often bought in the same order; falls back to same-category bestsellers. */
  async frequentlyBoughtTogether(productId: string, limit = 4) {
    const rows = await this.db.$queryRaw<Array<{ productId: string; c: bigint }>>`
      SELECT oi2.productId AS productId, COUNT(*) AS c
      FROM \`OrderItem\` oi1 JOIN \`OrderItem\` oi2 ON oi1.orderId = oi2.orderId AND oi2.productId <> oi1.productId
      WHERE oi1.productId = ${productId} AND oi2.productId IS NOT NULL
      GROUP BY oi2.productId ORDER BY c DESC LIMIT 20`;
    const ids = rows.map((r) => r.productId);
    let products = ids.length
      ? await this.db.product.findMany({ where: { ...this.liveWhere(), id: { in: ids }, inStock: true }, select: cardSelect })
      : [];
    products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (products.length < limit) {
      const more = await this.related(productId, limit * 2);
      const have = new Set(products.map((p) => p.id));
      const cards = await this.toCards(products);
      return [...cards, ...more.filter((m) => !have.has(m.id) && m.inStock)].slice(0, limit);
    }
    return this.toCards(products.slice(0, limit));
  }

  // ── Search helpers ─────────────────────────────────────────
  async suggestions(q: string) {
    const term = normalizeQuery(q);
    if (term.length < 2) return { products: [], categories: [], brands: [], queries: [] };
    const [products, categories, brands, queries] = await Promise.all([
      this.db.product.findMany({
        where: { ...this.liveWhere(), OR: [{ title: { contains: term } }, { searchText: { contains: term } }] },
        select: { id: true, slug: true, title: true, minPrice: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true, storageKey: true } } },
        orderBy: [{ soldCount: 'desc' }],
        take: 6,
      }),
      this.db.category.findMany({
        where: { isActive: true, deletedAt: null, name: { contains: term } },
        select: { id: true, name: true, slug: true },
        take: 4,
      }),
      this.db.brand.findMany({ where: { isActive: true, deletedAt: null, name: { contains: term } }, select: { id: true, name: true, slug: true }, take: 4 }),
      this.db.searchHistory.groupBy({
        by: ['normalized'],
        where: { normalized: { startsWith: term }, resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 60 * 86400_000) } },
        _count: { _all: true },
        orderBy: { _count: { normalized: 'desc' } },
        take: 5,
      }),
    ]);
    return {
      products: products.map((p) => ({ id: p.id, slug: p.slug, title: p.title, price: num(p.minPrice), thumbUrl: thumbOf(p.images[0]) })),
      categories,
      brands,
      queries: queries.map((qq) => qq.normalized),
    };
  }

  async recordSearch(userId: string | null, query: string, resultsCount: number) {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) return;
    await this.db.searchHistory.create({ data: { userId, query: query.slice(0, 120), normalized, resultsCount } });
  }

  async popularSearches(limit = 10) {
    const key = 'search:popular';
    const cached = await this.cache.get<string[]>(key);
    if (cached) return cached;
    const rows = await this.db.searchHistory.groupBy({
      by: ['normalized'],
      where: { resultsCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      _count: { _all: true },
      orderBy: { _count: { normalized: 'desc' } },
      take: limit,
    });
    const result = rows.map((r) => r.normalized);
    await this.cache.set(key, result, 600);
    return result;
  }

  async recentSearches(userId: string, limit = 10) {
    const rows = await this.db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { query: true, normalized: true },
    });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      if (seen.has(r.normalized)) continue;
      seen.add(r.normalized);
      out.push(r.query);
      if (out.length >= limit) break;
    }
    return out;
  }

  clearSearchHistory(userId: string) {
    return this.db.searchHistory.deleteMany({ where: { userId } });
  }

  // ── Merchandising blocks (homepage sections) ───────────────
  async productsBy(kind: string, limit: number, categoryId?: string | null) {
    const where: Prisma.ProductWhereInput = { ...this.liveWhere(), inStock: true };
    if (categoryId) where.categoryId = { in: await this.catalog.subtreeIds(categoryId) };
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ soldCount: 'desc' }];
    switch (kind) {
      case 'TRENDING':
        orderBy = [{ viewCount: 'desc' }, { soldCount: 'desc' }];
        break;
      case 'NEW_ARRIVALS':
        orderBy = [{ publishedAt: 'desc' }];
        break;
      case 'ON_SALE':
        where.maxDiscountPct = { gte: 15 };
        orderBy = [{ maxDiscountPct: 'desc' }];
        break;
      case 'FEATURED_PRODUCTS':
        where.isFeatured = true;
        orderBy = [{ updatedAt: 'desc' }];
        break;
      case 'RECOMMENDED':
        orderBy = [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }];
        break;
    }
    const rows = await this.db.product.findMany({ where, select: cardSelect, orderBy, take: limit });
    return this.toCards(rows);
  }

  /** Personalised picks from the categories the user viewed recently. */
  async recommendedFor(userId: string, limit = 12) {
    const recent = await this.db.recentlyViewedProduct.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 20,
      select: { productId: true, product: { select: { categoryId: true } } },
    });
    if (!recent.length) return this.productsBy('RECOMMENDED', limit);
    const categoryIds = [...new Set(recent.map((r) => r.product.categoryId))];
    const rows = await this.db.product.findMany({
      where: { ...this.liveWhere(), inStock: true, categoryId: { in: categoryIds }, id: { notIn: recent.map((r) => r.productId) } },
      select: cardSelect,
      orderBy: [{ ratingAvg: 'desc' }, { soldCount: 'desc' }],
      take: limit,
    });
    return this.toCards(rows);
  }

  async featuredSellers(limit = 8) {
    const sellers = await this.db.seller.findMany({
      where: { status: 'APPROVED', deletedAt: null, isFeatured: true },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, _count: { select: { listings: { where: purchasableListingWhere } } } },
      take: limit,
    });
    return sellers.map((s) => ({
      id: s.id,
      name: s.displayName,
      slug: s.slug,
      logoUrl: s.logoUrl,
      description: s.description,
      rating: num(s.ratingAvg),
      ratingCount: s.ratingCount,
      productCount: s._count.listings,
    }));
  }

  async sellerStore(slug: string) {
    const seller = await this.db.seller.findFirst({
      where: { slug, status: 'APPROVED', deletedAt: null },
      select: { id: true, displayName: true, slug: true, logoUrl: true, description: true, ratingAvg: true, ratingCount: true, createdAt: true, fulfillmentMode: true },
    });
    if (!seller) throw notFound('Seller');
    return { ...seller, ratingAvg: num(seller.ratingAvg) };
  }

  /** Data for sitemap.xml */
  async sitemapEntries() {
    const [products, categories, sellers] = await Promise.all([
      this.db.product.findMany({ where: this.liveWhere(), select: { slug: true, updatedAt: true }, take: 45000 }),
      this.db.category.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
      this.db.seller.findMany({ where: { status: 'APPROVED', deletedAt: null }, select: { slug: true, updatedAt: true } }),
    ]);
    return { products, categories, sellers };
  }
}
