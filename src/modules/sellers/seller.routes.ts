import { z } from 'zod';
import {
  bulkInventorySchema,
  idSchema,
  inventoryAdjustSchema,
  managedProductQuerySchema,
  moneySchema,
  orderListQuerySchema,
  paginationQuerySchema,
  Permissions,
  phoneSchema,
  productUpsertSchema,
  returnDecisionSchema,
  sellerBusinessSchema,
  sellerAgreementSchema,
  sellerDocumentTypeSchema,
  sellerOrderStatusSchema,
  sellerProfileUpdateSchema,
  sellerRegistrationSchema,
  SETTLEMENT_STATUSES,
} from '@vyora/shared';
import type { Container } from '../../bootstrap/container';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from '../../http/pipeline';
import { actorOf, exportQuery, idParams, MB, rangeQuery, sellerIdOf } from '../../http/helpers';
import { reply, route } from '../../http/route';
import { randomToken } from '../../shared/crypto';
import { badRequest } from '../../shared/errors';
import { defaultRange } from '../analytics/analytics.service';

const tags = ['Seller'];
const P = Permissions;

export function sellerRoutes(c: Container) {
  const s = c.services;
  const scope = (ctx: Parameters<typeof sellerIdOf>[0]) => ({ kind: 'seller' as const, sellerId: sellerIdOf(ctx) });

  return [
    // ── Onboarding ───────────────────────────────────────────
    route({
      method: 'POST',
      path: '/sellers/register',
      auth: 'public',
      schema: { body: sellerRegistrationSchema },
      rateLimit: { name: 'seller:register', windowSeconds: 3600, max: 10 },
      docs: { tags: ['Seller onboarding'], summary: 'Register as a seller (status PENDING_APPROVAL)' },
      handler: async (ctx) => {
        const session = await s.sellers.register(ctx.body, { ip: ctx.ip, userAgent: ctx.userAgent });
        ctx.setCookie(ACCESS_COOKIE, session.accessToken, { maxAgeSeconds: session.accessMaxAgeSeconds });
        ctx.setCookie(REFRESH_COOKIE, session.refreshToken, { maxAgeSeconds: session.refreshMaxAgeSeconds, path: '/api/v1/auth' });
        ctx.setCookie(CSRF_COOKIE, randomToken(24), { httpOnly: false });
        return reply.created(await s.auth.sessionUser(session.userId), 'Application submitted. We will review it shortly.');
      },
    }),
    route({
      method: 'POST',
      path: '/sellers/apply',
      auth: 'required',
      schema: { body: sellerBusinessSchema.extend(sellerAgreementSchema.shape).extend({ phone: phoneSchema }) },
      docs: { tags: ['Seller onboarding'], summary: 'Apply to sell from an existing customer account' },
      handler: async (ctx) => reply.created(await s.sellers.applyAsExistingUser(ctx.auth!.userId, ctx.body), 'Application submitted'),
    }),
    route({
      method: 'GET',
      path: '/sellers/me',
      auth: 'required',
      seller: true,
      docs: { tags, summary: 'Your seller account, documents and approval history' },
      handler: async (ctx) => s.sellers.me(sellerIdOf(ctx)),
    }),
    route({
      method: 'PATCH',
      path: '/sellers/me',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PROFILE],
      schema: { body: sellerProfileUpdateSchema },
      docs: { tags, summary: 'Update store profile' },
      handler: async (ctx) => reply.ok(await s.sellers.updateProfile(sellerIdOf(ctx), ctx.body, actorOf(ctx)), 'Profile updated'),
    }),
    route({
      method: 'POST',
      path: '/sellers/me/logo',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PROFILE],
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: 'image' },
      docs: { tags, summary: 'Upload store logo (multipart field "file")' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest('Choose an image');
        return reply.ok(await s.sellers.uploadLogo(sellerIdOf(ctx), ctx.files[0]), 'Logo updated');
      },
    }),
    route({
      method: 'POST',
      path: '/sellers/me/documents',
      auth: 'required',
      seller: true,
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_DOCUMENT_MB * MB, allowed: 'document' },
      schema: { body: z.object({ type: sellerDocumentTypeSchema }) },
      docs: { tags, summary: 'Upload a KYC document (private storage)' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest('Choose a file');
        return reply.created(await s.sellers.uploadDocument(sellerIdOf(ctx), ctx.body.type, ctx.files[0], actorOf(ctx)), 'Document uploaded');
      },
    }),
    route({
      method: 'GET',
      path: '/sellers/me/documents/:id/url',
      auth: 'required',
      seller: true,
      schema: { params: idParams },
      docs: { tags, summary: 'Short-lived signed URL for one of your documents' },
      handler: async (ctx) => s.sellers.documentUrl(ctx.params.id, { sellerId: sellerIdOf(ctx) }),
    }),
    route({
      method: 'DELETE',
      path: '/sellers/me/documents/:id',
      auth: 'required',
      seller: true,
      schema: { params: idParams },
      docs: { tags, summary: 'Remove an unverified document' },
      handler: async (ctx) => {
        await s.sellers.deleteDocument(ctx.params.id, sellerIdOf(ctx));
        return reply.ok(null, 'Document removed');
      },
    }),

    // ── Dashboard ────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/seller/dashboard',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_DASHBOARD],
      schema: { query: rangeQuery },
      docs: { tags, summary: 'Seller KPIs computed from your own records only' },
      handler: async (ctx) => s.analytics.sellerDashboard(sellerIdOf(ctx), defaultRange(ctx.query.from, ctx.query.to)),
    }),

    // ── Products ─────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/seller/products',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { query: managedProductQuerySchema.omit({ sellerId: true }) },
      docs: { tags, summary: 'Your products and offers' },
      handler: async (ctx) => ({
        ...(await s.products.listManaged(scope(ctx), ctx.query)),
        counts: await s.products.statusCounts(scope(ctx)),
      }),
    }),
    route({
      method: 'POST',
      path: '/seller/products',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { body: productUpsertSchema },
      docs: { tags, summary: 'Create a product (saved as draft)' },
      handler: async (ctx) => reply.created(await s.products.create(sellerIdOf(ctx), ctx.body, actorOf(ctx)), 'Product saved as draft'),
    }),
    route({
      method: 'GET',
      path: '/seller/products/export',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { query: exportQuery },
      docs: { tags, summary: 'Export your catalog (CSV/XLSX)' },
      handler: async (ctx) => {
        const file = await s.productIo.export({ sellerId: sellerIdOf(ctx) }, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      },
    }),
    route({
      method: 'GET',
      path: '/seller/products/import-template',
      auth: 'required',
      seller: true,
      docs: { tags, summary: 'CSV import template' },
      handler: async () => reply.buffer(s.productIo.template(), 'text/csv; charset=utf-8', { filename: 'product-import-template.csv' }),
    }),
    route({
      method: 'POST',
      path: '/seller/products/import',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      upload: { maxFiles: 1, maxFileBytes: 5 * MB, allowed: 'spreadsheet' },
      rateLimit: { name: 'seller:import', windowSeconds: 300, max: 10, by: 'user' },
      docs: { tags, summary: 'Bulk import products from CSV/XLSX' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest('Choose a CSV or Excel file');
        return s.productIo.import(sellerIdOf(ctx), ctx.files[0], actorOf(ctx));
      },
    }),
    route({
      method: 'GET',
      path: '/seller/products/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags, summary: 'One of your products (404 for anyone else’s)' },
      handler: async (ctx) => s.products.getManaged(ctx.params.id, scope(ctx)),
    }),
    route({
      method: 'PATCH',
      path: '/seller/products/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams, body: productUpsertSchema },
      docs: { tags, summary: 'Update your product' },
      handler: async (ctx) => reply.ok(await s.products.update(ctx.params.id, ctx.body, scope(ctx), actorOf(ctx)), 'Product updated'),
    }),
    route({
      method: 'DELETE',
      path: '/seller/products/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags, summary: 'Archive your product' },
      handler: async (ctx) => {
        await s.products.archive(ctx.params.id, scope(ctx), actorOf(ctx));
        return reply.ok(null, 'Product archived');
      },
    }),
    route({
      method: 'POST',
      path: '/seller/products/:id/submit',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams },
      docs: { tags, summary: 'Submit a draft/rejected product for review' },
      handler: async (ctx) => reply.ok(await s.products.submit(ctx.params.id, scope(ctx), actorOf(ctx)), 'Submitted for review'),
    }),
    route({
      method: 'PATCH',
      path: '/seller/products/:id/active',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams, body: z.object({ isActive: z.boolean() }) },
      docs: { tags, summary: 'Activate or deactivate your listings for a product' },
      handler: async (ctx) => {
        await s.products.setActive(ctx.params.id, sellerIdOf(ctx), ctx.body.isActive, actorOf(ctx));
        return reply.ok(null, ctx.body.isActive ? 'Listing activated' : 'Listing deactivated');
      },
    }),
    route({
      method: 'POST',
      path: '/seller/products/:id/images',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams },
      upload: { maxFiles: 10, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: 'image' },
      docs: { tags, summary: 'Upload product images (multipart)' },
      handler: async (ctx) => reply.ok(await s.products.addImages(ctx.params.id, ctx.files, scope(ctx), actorOf(ctx)), 'Images uploaded'),
    }),
    route({
      method: 'DELETE',
      path: '/seller/products/:id/images/:imageId',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: z.object({ id: idSchema, imageId: idSchema }) },
      docs: { tags, summary: 'Remove a product image' },
      handler: async (ctx) => reply.ok(await s.products.removeImage(ctx.params.id, ctx.params.imageId, scope(ctx), actorOf(ctx)), 'Image removed'),
    }),
    route({
      method: 'PUT',
      path: '/seller/products/:id/images',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { params: idParams, body: z.object({ imageIds: z.array(idSchema).max(10) }) },
      docs: { tags, summary: 'Reorder product images' },
      handler: async (ctx) => s.products.reorderImages(ctx.params.id, ctx.body.imageIds, scope(ctx)),
    }),
    route({
      method: 'GET',
      path: '/seller/catalog',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: { query: paginationQuerySchema },
      docs: { tags, summary: 'Approved catalog products you can also sell' },
      handler: async (ctx) => {
        const res = await s.storefront.list({ ...ctx.query, sort: ctx.query.q ? 'relevance' : 'popular' } as never);
        return res;
      },
    }),
    route({
      method: 'POST',
      path: '/seller/offers',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_PRODUCTS],
      schema: {
        body: z.object({
          productId: idSchema,
          variantId: idSchema,
          sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/),
          price: moneySchema,
          mrp: moneySchema,
          stock: z.coerce.number().int().min(0).max(1_000_000),
        }),
      },
      docs: { tags, summary: 'Sell an existing catalog product (your own offer, price and stock)' },
      handler: async (ctx) => reply.created(await s.products.createOffer(sellerIdOf(ctx), ctx.body, actorOf(ctx)), 'Offer created'),
    }),

    // ── Inventory ────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/seller/inventory',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_INVENTORY],
      schema: { query: paginationQuerySchema.extend({ filter: z.enum(['all', 'low', 'out']).default('all') }) },
      docs: { tags, summary: 'Your stock levels' },
      handler: async (ctx) => s.inventory.list({ sellerId: sellerIdOf(ctx) }, ctx.query),
    }),
    route({
      method: 'PATCH',
      path: '/seller/inventory/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_INVENTORY],
      schema: { params: idParams, body: inventoryAdjustSchema },
      docs: { tags, summary: 'Adjust stock of one of your listings (id = listing id)' },
      handler: async (ctx) => reply.ok(await s.inventory.adjust(ctx.params.id, ctx.body, actorOf(ctx), { sellerId: sellerIdOf(ctx) }), 'Stock updated'),
    }),
    route({
      method: 'POST',
      path: '/seller/inventory/bulk',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_INVENTORY],
      schema: { body: bulkInventorySchema },
      docs: { tags, summary: 'Bulk stock update by SKU' },
      handler: async (ctx) => s.inventory.bulkUpdate(sellerIdOf(ctx), ctx.body.items, ctx.body.reason, actorOf(ctx)),
    }),
    route({
      method: 'GET',
      path: '/seller/inventory/:id/movements',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_INVENTORY],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { tags, summary: 'Stock movement history of a listing' },
      handler: async (ctx) => s.inventory.movements(ctx.params.id, { sellerId: sellerIdOf(ctx) }, ctx.query.page, ctx.query.pageSize),
    }),

    // ── Orders & returns ─────────────────────────────────────
    route({
      method: 'GET',
      path: '/seller/orders',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { query: orderListQuerySchema.omit({ sellerId: true }) },
      docs: { tags, summary: 'Your sub-orders (only your items)' },
      handler: async (ctx) => s.orderQueries.sellerOrders(sellerIdOf(ctx), ctx.query),
    }),
    route({
      method: 'GET',
      path: '/seller/orders/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { params: idParams },
      docs: { tags, summary: 'Sub-order detail with delivery address' },
      handler: async (ctx) => s.orderQueries.sellerOrder(ctx.params.id, { sellerId: sellerIdOf(ctx) }),
    }),
    route({
      method: 'PATCH',
      path: '/seller/orders/:id/status',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { params: idParams, body: sellerOrderStatusSchema },
      docs: { tags, summary: 'Accept/reject, process, ship (with tracking) and deliver' },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.fulfillment.updateSellerOrderStatus(ctx.params.id, status, rest, scope(ctx), actorOf(ctx)), 'Order updated');
      },
    }),
    route({
      method: 'GET',
      path: '/seller/orders/:id/packing-slip',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { params: idParams },
      docs: { tags, summary: 'Printable packing slip (HTML)' },
      handler: async (ctx) => {
        const brand = (await s.settings.get('branding')).name;
        return reply.html(await s.orderQueries.packingSlip(ctx.params.id, { sellerId: sellerIdOf(ctx) }, brand));
      },
    }),
    route({
      method: 'GET',
      path: '/seller/returns',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { query: paginationQuerySchema.extend({ status: z.string().max(20).optional() }) },
      docs: { tags, summary: 'Return requests for your orders' },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: sellerIdOf(ctx) }, ctx.query),
    }),
    route({
      method: 'PATCH',
      path: '/seller/returns/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_ORDERS],
      schema: { params: idParams, body: returnDecisionSchema },
      docs: { tags, summary: 'Approve, reject or receive a return' },
      handler: async (ctx) => {
        await s.fulfillment.decideReturn(ctx.params.id, ctx.body, scope(ctx), actorOf(ctx));
        return reply.ok(null, 'Return updated');
      },
    }),

    // ── Finance ──────────────────────────────────────────────
    route({
      method: 'GET',
      path: '/seller/balance',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_SETTLEMENTS],
      docs: { tags, summary: 'Ledger balance and payable amount' },
      handler: async (ctx) => s.finance.balances(sellerIdOf(ctx)),
    }),
    route({
      method: 'GET',
      path: '/seller/ledger',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }) },
      docs: { tags, summary: 'Your ledger entries' },
      handler: async (ctx) => s.finance.ledger(sellerIdOf(ctx), ctx.query),
    }),
    route({
      method: 'GET',
      path: '/seller/settlements',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ status: z.enum(SETTLEMENT_STATUSES).optional() }) },
      docs: { tags, summary: 'Your settlements' },
      handler: async (ctx) => s.finance.listSettlements({ sellerId: sellerIdOf(ctx) }, ctx.query),
    }),
    route({
      method: 'GET',
      path: '/seller/settlements/:id',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_SETTLEMENTS],
      schema: { params: idParams },
      docs: { tags, summary: 'Settlement detail' },
      handler: async (ctx) => s.finance.settlementDetail(ctx.params.id, { sellerId: sellerIdOf(ctx) }),
    }),
    route({
      method: 'GET',
      path: '/seller/commissions',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_SETTLEMENTS],
      schema: { query: paginationQuerySchema.extend({ status: z.string().max(20).optional() }) },
      docs: { tags, summary: 'Commission deducted per order item' },
      handler: async (ctx) => s.finance.commissions({ sellerId: sellerIdOf(ctx) }, ctx.query),
    }),
    route({
      method: 'GET',
      path: '/seller/reports/:kind/export',
      auth: 'required',
      seller: true,
      permissions: [P.SELLER_DASHBOARD],
      schema: { params: z.object({ kind: z.enum(['sales', 'orders', 'products', 'settlements', 'ledger']) }), query: exportQuery },
      docs: { tags, summary: 'Export your reports (CSV/XLSX)' },
      handler: async (ctx) => {
        const file = await s.analytics.export(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), sellerIdOf(ctx), ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      },
    }),
  ];
}
