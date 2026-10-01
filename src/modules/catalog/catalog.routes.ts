import { z } from 'zod';
import {
  attributeSchema,
  brandSchema,
  categorySchema,
  idSchema,
  Permissions,
  pincodeSchema,
  productListQuerySchema,
  SHIPPING_METHODS,
} from '@vyora/shared';
import type { Container } from '../../bootstrap/container';
import { actorOf, idParams } from '../../http/helpers';
import { reply, route } from '../../http/route';

const tags = ['Catalog'];

export function catalogRoutes(c: Container) {
  const s = c.services;
  return [
    // ── Public storefront ────────────────────────────────────
    route({
      method: 'GET',
      path: '/config',
      auth: 'public',
      docs: { tags: ['Storefront'], summary: 'Public marketplace configuration (branding, COD rules)' },
      handler: async () => s.content.publicConfig(),
    }),
    route({
      method: 'GET',
      path: '/home',
      auth: 'public',
      docs: { tags: ['Storefront'], summary: 'Homepage banners and sections (admin configurable)' },
      handler: async () => s.content.homepage(),
    }),
    route({
      method: 'GET',
      path: '/categories',
      auth: 'public',
      docs: { tags, summary: 'Category tree' },
      handler: async () => s.catalog.tree(),
    }),
    route({
      method: 'GET',
      path: '/categories/:slug',
      auth: 'public',
      schema: { params: z.object({ slug: z.string().max(160) }) },
      docs: { tags, summary: 'Category with breadcrumbs, children and filterable attributes' },
      handler: async (ctx) => s.catalog.bySlug(ctx.params.slug),
    }),
    route({
      method: 'GET',
      path: '/brands',
      auth: 'public',
      schema: { query: z.object({ q: z.string().max(80).optional(), categoryId: idSchema.optional() }) },
      docs: { tags, summary: 'Active brands' },
      handler: async (ctx) => s.catalog.listBrands({ q: ctx.query.q, categoryId: ctx.query.categoryId }),
    }),
    route({
      method: 'GET',
      path: '/attributes',
      auth: 'public',
      schema: { query: z.object({ categoryId: idSchema.optional() }) },
      docs: { tags, summary: 'Attribute definitions (optionally for a category and its ancestors)' },
      handler: async (ctx) => (ctx.query.categoryId ? s.catalog.filterableAttributes(ctx.query.categoryId) : s.catalog.listAttributes()),
    }),
    route({
      method: 'GET',
      path: '/products',
      auth: 'public',
      schema: { query: productListQuerySchema },
      docs: { tags, summary: 'Product listing with filters, sorting, pagination and facets' },
      handler: async (ctx) => s.storefront.list(ctx.query, { facets: true }),
    }),
    route({
      method: 'GET',
      path: '/products/:slug',
      auth: 'optional',
      schema: { params: z.object({ slug: z.string().max(220) }) },
      docs: { tags, summary: 'Product detail with seller offers, related and frequently-bought-together items' },
      handler: async (ctx) => {
        const product = await s.storefront.detail(ctx.params.slug);
        const [related, frequentlyBoughtTogether] = await Promise.all([
          s.storefront.related(product.id, 12),
          s.storefront.frequentlyBoughtTogether(product.id, 4),
        ]);
        if (ctx.auth) void s.customers.recordView(ctx.auth.userId, product.id).catch(() => undefined);
        return { ...product, related, frequentlyBoughtTogether };
      },
    }),
    route({
      method: 'GET',
      path: '/stores/:slug',
      auth: 'public',
      schema: { params: z.object({ slug: z.string().max(160) }) },
      docs: { tags, summary: 'Public seller storefront profile' },
      handler: async (ctx) => s.storefront.sellerStore(ctx.params.slug),
    }),
    route({
      method: 'GET',
      path: '/sellers-featured',
      auth: 'public',
      docs: { tags, summary: 'Featured sellers' },
      handler: async () => s.storefront.featuredSellers(12),
    }),

    // ── Search ───────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/search',
      auth: 'optional',
      schema: { query: productListQuerySchema.extend({ q: z.string().trim().min(1).max(120) }) },
      rateLimit: { name: 'search', windowSeconds: 60, max: 120 },
      docs: { tags: ['Search'], summary: 'Full-text product search (name, brand, category, SKU, attributes)' },
      handler: async (ctx) => {
        const result = await s.storefront.list(ctx.query, { facets: true });
        if (ctx.query.page === 1) void s.storefront.recordSearch(ctx.auth?.userId ?? null, ctx.query.q, result.total).catch(() => undefined);
        const suggestions = result.total === 0 ? await s.storefront.productsBy('BEST_SELLERS', 8) : [];
        return { ...result, suggestions };
      },
    }),
    route({
      method: 'GET',
      path: '/search/suggestions',
      auth: 'public',
      schema: { query: z.object({ q: z.string().max(120).default('') }) },
      rateLimit: { name: 'search:suggest', windowSeconds: 60, max: 240 },
      docs: { tags: ['Search'], summary: 'Typeahead suggestions' },
      handler: async (ctx) => s.storefront.suggestions(ctx.query.q),
    }),
    route({
      method: 'GET',
      path: '/search/popular',
      auth: 'public',
      docs: { tags: ['Search'], summary: 'Popular searches (last 30 days)' },
      handler: async () => s.storefront.popularSearches(),
    }),
    route({
      method: 'GET',
      path: '/search/recent',
      auth: 'required',
      docs: { tags: ['Search'], summary: 'Your recent searches' },
      handler: async (ctx) => s.storefront.recentSearches(ctx.auth!.userId),
    }),
    route({
      method: 'DELETE',
      path: '/search/recent',
      auth: 'required',
      docs: { tags: ['Search'], summary: 'Clear your search history' },
      handler: async (ctx) => {
        await s.storefront.clearSearchHistory(ctx.auth!.userId);
        return reply.ok(null, 'Search history cleared');
      },
    }),

    // ── Shipping helpers ─────────────────────────────────────
    route({
      method: 'GET',
      path: '/shipping/pincode/:pincode',
      auth: 'public',
      schema: {
        params: z.object({ pincode: pincodeSchema }),
        query: z.object({ method: z.enum(SHIPPING_METHODS).default('STANDARD') }),
      },
      docs: { tags: ['Shipping'], summary: 'Delivery eligibility, COD availability and estimated delivery range' },
      handler: async (ctx) => s.shipping.checkPincode(ctx.params.pincode, ctx.query.method),
    }),
    route({
      method: 'GET',
      path: '/shipping/methods',
      auth: 'public',
      docs: { tags: ['Shipping'], summary: 'Shipping methods and fees' },
      handler: async () => (await s.shipping.methods()).filter((m) => m.isActive),
    }),
    route({
      method: 'GET',
      path: '/coupons/available',
      auth: 'public',
      docs: { tags: ['Coupons'], summary: 'Currently redeemable coupons' },
      handler: async () => s.coupons.available(),
    }),

    // ── Admin: categories, brands, attributes ────────────────
    route({
      method: 'GET',
      path: '/admin/categories',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      docs: { tags: ['Admin · Catalog'], summary: 'Full category tree including inactive' },
      handler: async () => s.catalog.tree({ includeInactive: true }),
    }),
    route({
      method: 'GET',
      path: '/admin/categories/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ['Admin · Catalog'], summary: 'Category detail with commission and tax overrides' },
      handler: async (ctx) => s.catalog.categoryAdminDetail(ctx.params.id),
    }),
    route({
      method: 'POST',
      path: '/admin/categories',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: categorySchema },
      docs: { tags: ['Admin · Catalog'], summary: 'Create category' },
      handler: async (ctx) => reply.created(await s.catalog.createCategory(ctx.body, actorOf(ctx)), 'Category created'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/categories/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: categorySchema.partial() },
      docs: { tags: ['Admin · Catalog'], summary: 'Update category (also moves it in the tree)' },
      handler: async (ctx) => reply.ok(await s.catalog.updateCategory(ctx.params.id, ctx.body, actorOf(ctx)), 'Category updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/categories/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ['Admin · Catalog'], summary: 'Delete an empty category' },
      handler: async (ctx) => {
        await s.catalog.deleteCategory(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Category deleted');
      },
    }),
    route({
      method: 'PUT',
      path: '/admin/categories-order',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: z.object({ items: z.array(z.object({ id: idSchema, sortOrder: z.number().int().min(0) })).max(500) }) },
      docs: { tags: ['Admin · Catalog'], summary: 'Reorder categories' },
      handler: async (ctx) => {
        await s.catalog.reorderCategories(ctx.body.items, actorOf(ctx));
        return reply.ok(null, 'Order saved');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/brands',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { query: z.object({ q: z.string().max(80).optional() }) },
      docs: { tags: ['Admin · Catalog'], summary: 'All brands' },
      handler: async (ctx) => s.catalog.listBrands({ q: ctx.query.q, includeInactive: true }),
    }),
    route({
      method: 'POST',
      path: '/admin/brands',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: brandSchema },
      docs: { tags: ['Admin · Catalog'], summary: 'Create brand' },
      handler: async (ctx) => reply.created(await s.catalog.createBrand(ctx.body, actorOf(ctx)), 'Brand created'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/brands/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: brandSchema.partial() },
      docs: { tags: ['Admin · Catalog'], summary: 'Update brand' },
      handler: async (ctx) => reply.ok(await s.catalog.updateBrand(ctx.params.id, ctx.body, actorOf(ctx)), 'Brand updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/brands/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ['Admin · Catalog'], summary: 'Delete unused brand' },
      handler: async (ctx) => {
        await s.catalog.deleteBrand(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Brand deleted');
      },
    }),
    route({
      method: 'POST',
      path: '/admin/attributes',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { body: attributeSchema },
      docs: { tags: ['Admin · Catalog'], summary: 'Create attribute' },
      handler: async (ctx) => reply.created(await s.catalog.createAttribute(ctx.body, actorOf(ctx)), 'Attribute created'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/attributes/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams, body: attributeSchema.partial() },
      docs: { tags: ['Admin · Catalog'], summary: 'Update attribute' },
      handler: async (ctx) => reply.ok(await s.catalog.updateAttribute(ctx.params.id, ctx.body, actorOf(ctx)), 'Attribute updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/attributes/:id',
      auth: 'required',
      permissions: [Permissions.CATALOG_MANAGE],
      schema: { params: idParams },
      docs: { tags: ['Admin · Catalog'], summary: 'Delete attribute' },
      handler: async (ctx) => {
        await s.catalog.deleteAttribute(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Attribute deleted');
      },
    }),
  ];
}
