import type { PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { bannerSchema, homeSectionSchema, promotionSchema } from '@vyora/shared';
import type { CacheProvider } from '../../infrastructure/cache';
import type { StorageProvider } from '../../infrastructure/storage';
import { storeOptimizedImage } from '../../infrastructure/storage';
import type { UploadedFile } from '../../http/types';
import { notFound } from '../../shared/errors';
import { num } from '../../shared/money';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { CatalogService } from '../catalog/category.service';
import type { StorefrontService } from '../catalog/storefront.service';
import type { SettingsService } from '../settings/settings.service';

type BannerInput = z.infer<typeof bannerSchema>;
type SectionInput = z.infer<typeof homeSectionSchema>;
type PromotionInput = z.infer<typeof promotionSchema>;

/** Admin-managed storefront content: banners, homepage sections, promotions, branding. */
export class ContentService {
  constructor(
    private readonly db: PrismaClient,
    private readonly storefront: StorefrontService,
    private readonly catalog: CatalogService,
    private readonly settings: SettingsService,
    private readonly storage: StorageProvider,
    private readonly cache: CacheProvider,
    private readonly audit: AuditService,
  ) {}

  private activeWindow() {
    const now = new Date();
    return {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    };
  }

  /** The public homepage: banners + every active section resolved to real data. */
  async homepage() {
    const cached = await this.cache.get<unknown>('home:page');
    if (cached) return cached;
    const [banners, sections, promotions] = await Promise.all([
      this.db.banner.findMany({ where: this.activeWindow(), orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] }),
      this.db.homeSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { category: { select: { id: true, name: true, slug: true } } } }),
      this.activePromotions(),
    ]);
    const categories = await this.catalog.tree();
    const resolved = [];
    for (const s of sections) {
      const base = { id: s.id, type: s.type, title: s.title, subtitle: s.subtitle, category: s.category };
      if (s.type === 'CATEGORY_GRID') {
        resolved.push({ ...base, categories: categories.slice(0, s.limit).map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, icon: c.icon, productCount: c.productCount })) });
      } else if (s.type === 'FEATURED_SELLERS') {
        resolved.push({ ...base, sellers: await this.storefront.featuredSellers(s.limit) });
      } else if (s.type === 'RECENTLY_VIEWED') {
        // Personalised — resolved client-side via /me/recently-viewed.
        resolved.push({ ...base, personalised: true });
      } else {
        const kind = s.type === 'CATEGORY_PRODUCTS' ? 'BEST_SELLERS' : s.type;
        const products = await this.storefront.productsBy(kind, s.limit, s.categoryId);
        if (products.length) resolved.push({ ...base, products });
      }
    }
    const page = {
      banners: {
        hero: banners.filter((b) => b.placement === 'HERO'),
        strip: banners.filter((b) => b.placement === 'STRIP'),
        category: banners.filter((b) => b.placement === 'CATEGORY'),
      },
      sections: resolved,
      promotions,
    };
    await this.cache.set('home:page', page, 60);
    return page;
  }

  async activePromotions() {
    const now = new Date();
    const rows = await this.db.promotion.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { endsAt: 'asc' },
    });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }

  /** Public, non-sensitive settings needed by the storefront shell. */
  async publicConfig() {
    const s = await this.settings.all();
    return {
      branding: s.branding,
      cod: { enabled: s.cod.enabled, maxOrderValue: s.cod.maxOrderValue, fee: s.cod.fee },
      returns: s.returns,
      reviews: { onlyVerifiedPurchasers: s.reviews.onlyVerifiedPurchasers },
      tax: { pricesInclusive: s.tax.pricesInclusive },
    };
  }

  // ── Admin CRUD ─────────────────────────────────────────────
  private async bust() {
    await this.cache.delPrefix('home:');
  }

  listBanners() {
    return this.db.banner.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] });
  }
  async createBanner(input: BannerInput, actor: AuditActor) {
    const b = await this.db.banner.create({ data: input });
    await this.audit.record(actor, { action: 'banner.create', entityType: 'Banner', entityId: b.id, after: b });
    await this.bust();
    return b;
  }
  async updateBanner(id: string, input: BannerInput, actor: AuditActor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound('Banner');
    const b = await this.db.banner.update({ where: { id }, data: input });
    await this.audit.record(actor, { action: 'banner.update', entityType: 'Banner', entityId: id, before, after: b });
    await this.bust();
    return b;
  }
  async deleteBanner(id: string, actor: AuditActor) {
    const before = await this.db.banner.findUnique({ where: { id } });
    if (!before) throw notFound('Banner');
    await this.db.banner.delete({ where: { id } });
    await this.audit.record(actor, { action: 'banner.delete', entityType: 'Banner', entityId: id, before });
    await this.bust();
  }
  async uploadImage(file: UploadedFile) {
    const stored = await storeOptimizedImage(this.storage, 'content', file.buffer, file.mimeType);
    return { url: stored.url, thumbUrl: stored.thumbUrl };
  }

  listSections() {
    return this.db.homeSection.findMany({ orderBy: { sortOrder: 'asc' }, include: { category: { select: { id: true, name: true } } } });
  }
  async createSection(input: SectionInput, actor: AuditActor) {
    const s = await this.db.homeSection.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'home_section.create', entityType: 'HomeSection', entityId: s.id, after: s });
    await this.bust();
    return s;
  }
  async updateSection(id: string, input: SectionInput, actor: AuditActor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound('Section');
    const s = await this.db.homeSection.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'home_section.update', entityType: 'HomeSection', entityId: id, before, after: s });
    await this.bust();
    return s;
  }
  async deleteSection(id: string, actor: AuditActor) {
    const before = await this.db.homeSection.findUnique({ where: { id } });
    if (!before) throw notFound('Section');
    await this.db.homeSection.delete({ where: { id } });
    await this.audit.record(actor, { action: 'home_section.delete', entityType: 'HomeSection', entityId: id, before });
    await this.bust();
  }

  async listPromotions() {
    const rows = await this.db.promotion.findMany({ orderBy: { startsAt: 'desc' }, include: { category: { select: { id: true, name: true } } } });
    return rows.map((p) => ({ ...p, discountPercent: num(p.discountPercent) }));
  }
  async createPromotion(input: PromotionInput, actor: AuditActor) {
    const p = await this.db.promotion.create({ data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'promotion.create', entityType: 'Promotion', entityId: p.id, after: p });
    await this.bust();
    return p;
  }
  async updatePromotion(id: string, input: PromotionInput, actor: AuditActor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound('Promotion');
    const p = await this.db.promotion.update({ where: { id }, data: { ...input, categoryId: input.categoryId ?? null } });
    await this.audit.record(actor, { action: 'promotion.update', entityType: 'Promotion', entityId: id, before, after: p });
    await this.bust();
    return p;
  }
  async deletePromotion(id: string, actor: AuditActor) {
    const before = await this.db.promotion.findUnique({ where: { id } });
    if (!before) throw notFound('Promotion');
    await this.db.promotion.delete({ where: { id } });
    await this.audit.record(actor, { action: 'promotion.delete', entityType: 'Promotion', entityId: id, before });
    await this.bust();
  }
}
