import { z } from 'zod';
import {
  adminCreateSellerSchema,
  bannerSchema,
  commissionRuleSchema,
  COMMISSION_SCOPES,
  couponSchema,
  createSettlementSchema,
  homeSectionSchema,
  idSchema,
  inventoryAdjustSchema,
  ledgerAdjustmentSchema,
  managedProductQuerySchema,
  notificationTemplateSchema,
  orderListQuerySchema,
  paginationQuerySchema,
  Permissions,
  pincodeSchemaInput,
  productRejectSchema,
  productUpsertSchema,
  promotionSchema,
  returnDecisionSchema,
  sellerDecisionSchema,
  sellerOrderStatusSchema,
  sellerProfileUpdateSchema,
  sellerStatusQuerySchema,
  settlementStatusSchema,
  SETTLEMENT_STATUSES,
  shippingConfigSchema,
  taxConfigSchema,
  userAdminUpdateSchema,
} from '@vyora/shared';
import type { Container } from '../../bootstrap/container';
import { actorOf, exportQuery, idParams, MB, rangeQuery } from '../../http/helpers';
import { reply, route } from '../../http/route';
import { badRequest } from '../../shared/errors';
import { defaultRange } from '../analytics/analytics.service';
import { SETTING_KEYS, type SettingKey } from '../settings/settings.service';
import { databaseStatus } from '../../database/status';

const P = Permissions;
const A = { auth: 'required' as const };
const adminScope = { kind: 'admin' as const };

export function adminRoutes(c: Container) {
  const s = c.services;
  const t = (tag: string) => ({ tags: [`Admin · ${tag}`] });

  const dashboard = [
    route({
      method: 'GET',
      path: '/admin/dashboard',
      ...A,
      permissions: [P.REPORTS_READ],
      schema: { query: rangeQuery },
      docs: { ...t('Reports'), summary: 'Marketplace KPIs from live data' },
      handler: async (ctx) => s.analytics.adminDashboard(defaultRange(ctx.query.from, ctx.query.to)),
    }),
    route({
      method: 'GET',
      path: '/admin/reports/:kind',
      ...A,
      permissions: [P.REPORTS_READ],
      schema: {
        params: z.object({ kind: z.enum(['sales', 'orders', 'products', 'sellers', 'categories', 'settlements', 'ledger']) }),
        query: rangeQuery.extend({ sellerId: idSchema.optional() }),
      },
      docs: { ...t('Reports'), summary: 'Report data as rows' },
      handler: async (ctx) => s.analytics.report(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), ctx.query.sellerId ?? null),
    }),
    route({
      method: 'GET',
      path: '/admin/reports/:kind/export',
      ...A,
      permissions: [P.REPORTS_READ],
      schema: {
        params: z.object({ kind: z.enum(['sales', 'orders', 'products', 'sellers', 'categories', 'settlements', 'ledger']) }),
        query: exportQuery.extend({ sellerId: idSchema.optional() }),
      },
      docs: { ...t('Reports'), summary: 'Export a report (CSV/XLSX)' },
      handler: async (ctx) => {
        const file = await s.analytics.export(ctx.params.kind, defaultRange(ctx.query.from, ctx.query.to), ctx.query.sellerId ?? null, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      },
    }),
  ];

  const users = [
    route({
      method: 'GET',
      path: '/admin/users',
      ...A,
      permissions: [P.USERS_READ],
      schema: {
        query: paginationQuerySchema.extend({
          role: z.enum(['ADMIN', 'SELLER', 'CUSTOMER']).optional(),
          status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED', 'DELETED']).optional(),
        }),
      },
      docs: { ...t('Users'), summary: 'All users' },
      handler: async (ctx) => s.users.list(ctx.query),
    }),
    route({
      method: 'GET',
      path: '/admin/users/:id',
      ...A,
      permissions: [P.USERS_READ],
      schema: { params: idParams },
      docs: { ...t('Users'), summary: 'User detail with security events' },
      handler: async (ctx) => s.users.detail(ctx.params.id),
    }),
    route({
      method: 'PATCH',
      path: '/admin/users/:id',
      ...A,
      permissions: [P.USERS_MANAGE],
      schema: { params: idParams, body: userAdminUpdateSchema },
      docs: { ...t('Users'), summary: 'Suspend/reactivate a user or change roles' },
      handler: async (ctx) => {
        if (ctx.body.roles && !ctx.auth!.permissions.has(P.ROLES_MANAGE)) throw badRequest('Changing roles requires roles:manage');
        return reply.ok(await s.users.update(ctx.params.id, ctx.body, actorOf(ctx)), 'User updated');
      },
    }),
    route({
      method: 'POST',
      path: '/admin/users/:id/anonymize',
      ...A,
      permissions: [P.USERS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Users'), summary: 'Complete account deletion (anonymise, keep financial history)' },
      handler: async (ctx) => {
        await s.users.anonymize(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Account deleted');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/roles',
      ...A,
      permissions: [P.ROLES_MANAGE],
      docs: { ...t('Users'), summary: 'Roles and permissions' },
      handler: async () => s.users.roles(),
    }),
    route({
      method: 'PUT',
      path: '/admin/roles/:code/permissions',
      ...A,
      permissions: [P.ROLES_MANAGE],
      schema: { params: z.object({ code: z.enum(['ADMIN', 'SELLER', 'CUSTOMER']) }), body: z.object({ permissions: z.array(z.string().max(80)).max(100) }) },
      docs: { ...t('Users'), summary: 'Set the permissions granted to a role' },
      handler: async (ctx) => reply.ok(await s.users.setRolePermissions(ctx.params.code, ctx.body.permissions, actorOf(ctx)), 'Permissions saved'),
    }),
    route({
      method: 'GET',
      path: '/admin/audit-logs',
      ...A,
      permissions: [P.AUDIT_READ],
      schema: {
        query: paginationQuerySchema.extend({
          entityType: z.string().max(40).optional(),
          actorId: idSchema.optional(),
          action: z.string().max(80).optional(),
        }),
      },
      docs: { ...t('Security'), summary: 'Audit trail' },
      handler: async (ctx) => s.users.auditLogs(ctx.query),
    }),
    route({
      method: 'GET',
      path: '/admin/security-events',
      ...A,
      permissions: [P.AUDIT_READ],
      schema: { query: paginationQuerySchema.extend({ type: z.string().max(60).optional() }) },
      docs: { ...t('Security'), summary: 'Security events (logins, lockouts, denied access …)' },
      handler: async (ctx) => s.users.securityEvents(ctx.query),
    }),
  ];

  const sellers = [
    route({
      method: 'GET',
      path: '/admin/sellers',
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { query: sellerStatusQuerySchema },
      docs: { ...t('Sellers'), summary: 'All sellers' },
      handler: async (ctx) => s.sellers.list(ctx.query),
    }),
    route({
      method: 'POST',
      path: '/admin/sellers',
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: { body: adminCreateSellerSchema },
      docs: { ...t('Sellers'), summary: 'Create a seller and email a password-setup invitation' },
      handler: async (ctx) => reply.created(await s.sellers.adminCreate(ctx.body, actorOf(ctx)), 'Seller created and invitation sent'),
    }),
    route({
      method: 'GET',
      path: '/admin/sellers/outstanding',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      docs: { ...t('Finance'), summary: 'Seller balances awaiting settlement' },
      handler: async () => s.finance.outstanding(),
    }),
    route({
      method: 'GET',
      path: '/admin/sellers/:id',
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { params: idParams },
      docs: { ...t('Sellers'), summary: 'Seller detail, KYC documents and approval history' },
      handler: async (ctx) => s.sellers.adminDetail(ctx.params.id),
    }),
    route({
      method: 'PATCH',
      path: '/admin/sellers/:id',
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: {
        params: idParams,
        body: sellerProfileUpdateSchema.extend({
          businessName: z.string().trim().min(2).max(160).optional(),
          gstin: z.string().trim().max(15).optional(),
          pan: z.string().trim().max(10).optional(),
          isFeatured: z.boolean().optional(),
        }),
      },
      docs: { ...t('Sellers'), summary: 'Edit seller details / feature on homepage' },
      handler: async (ctx) => reply.ok(await s.sellers.adminUpdate(ctx.params.id, ctx.body, actorOf(ctx)), 'Seller updated'),
    }),
    ...(
      [
        ['approve', 'APPROVED', 'Seller approved'],
        ['reject', 'REJECTED', 'Seller rejected'],
        ['suspend', 'SUSPENDED', 'Seller suspended'],
        ['reactivate', 'APPROVED', 'Seller reactivated'],
        ['deactivate', 'INACTIVE', 'Seller deactivated'],
      ] as const
    ).map(([action, status, message]) =>
      route({
        method: 'PATCH',
        path: `/admin/sellers/:id/${action}`,
        ...A,
        permissions: [P.SELLERS_APPROVE],
        schema: { params: idParams, body: sellerDecisionSchema },
        docs: { ...t('Sellers'), summary: `${action[0].toUpperCase()}${action.slice(1)} seller` },
        handler: async (ctx) => reply.ok(await s.sellers.changeStatus(ctx.params.id, status, ctx.body.reason, actorOf(ctx)), message),
      }),
    ),
    route({
      method: 'POST',
      path: '/admin/sellers/:id/resend-invite',
      ...A,
      permissions: [P.SELLERS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Sellers'), summary: 'Resend the password-setup invitation' },
      handler: async (ctx) => {
        await s.sellers.resendInvite(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Invitation sent');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/sellers/:id/ledger',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t('Finance'), summary: 'A seller’s ledger and balance' },
      handler: async (ctx) => ({
        balance: await s.finance.balances(ctx.params.id),
        ledger: await s.finance.ledger(ctx.params.id, ctx.query),
      }),
    }),
    route({
      method: 'GET',
      path: '/admin/seller-documents/:id/url',
      ...A,
      permissions: [P.SELLERS_READ],
      schema: { params: idParams },
      docs: { ...t('Sellers'), summary: 'Signed URL for a KYC document' },
      handler: async (ctx) => s.sellers.documentUrl(ctx.params.id, { sellerId: null }),
    }),
    route({
      method: 'PATCH',
      path: '/admin/seller-documents/:id',
      ...A,
      permissions: [P.SELLERS_APPROVE],
      schema: { params: idParams, body: z.object({ status: z.enum(['VERIFIED', 'REJECTED']), note: z.string().max(500).optional() }) },
      docs: { ...t('Sellers'), summary: 'Verify or reject a KYC document' },
      handler: async (ctx) => reply.ok(await s.sellers.verifyDocument(ctx.params.id, ctx.body.status, ctx.body.note, actorOf(ctx)), 'Document updated'),
    }),
  ];

  const products = [
    route({
      method: 'GET',
      path: '/admin/products',
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { query: managedProductQuerySchema },
      docs: { ...t('Products'), summary: 'All products across sellers (review queue via status=PENDING_REVIEW)' },
      handler: async (ctx) => ({ ...(await s.products.listManaged(adminScope, ctx.query)), counts: await s.products.statusCounts(adminScope) }),
    }),
    route({
      method: 'POST',
      path: '/admin/products',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { body: productUpsertSchema.extend({ sellerId: idSchema }) },
      docs: { ...t('Products'), summary: 'Create a product on behalf of a seller' },
      handler: async (ctx) => {
        const { sellerId, ...input } = ctx.body;
        return reply.created(await s.products.create(sellerId, input, actorOf(ctx), true), 'Product created');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/products/export',
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { query: exportQuery },
      docs: { ...t('Products'), summary: 'Export all listings' },
      handler: async (ctx) => {
        const file = await s.productIo.export({ sellerId: null }, ctx.query.format);
        return reply.buffer(file.data, file.contentType, { filename: file.filename });
      },
    }),
    route({
      method: 'POST',
      path: '/admin/products/import',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      upload: { maxFiles: 1, maxFileBytes: 5 * MB, allowed: 'spreadsheet' },
      schema: { body: z.object({ sellerId: idSchema }) },
      docs: { ...t('Products'), summary: 'Bulk import products for a seller' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest('Choose a CSV or Excel file');
        return s.productIo.import(ctx.body.sellerId, ctx.files[0], actorOf(ctx));
      },
    }),
    route({
      method: 'GET',
      path: '/admin/products/:id',
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t('Products'), summary: 'Product with all seller listings and approval history' },
      handler: async (ctx) => s.products.getManaged(ctx.params.id, adminScope),
    }),
    route({
      method: 'PUT',
      path: '/admin/products/:id',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: productUpsertSchema },
      docs: { ...t('Products'), summary: 'Edit any product (audited)' },
      handler: async (ctx) => reply.ok(await s.products.update(ctx.params.id, ctx.body, adminScope, actorOf(ctx)), 'Product updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/products/:id',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams },
      docs: { ...t('Products'), summary: 'Remove (archive) a product' },
      handler: async (ctx) => {
        await s.products.archive(ctx.params.id, adminScope, actorOf(ctx));
        return reply.ok(null, 'Product removed');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/products/:id/history',
      ...A,
      permissions: [P.PRODUCTS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t('Products'), summary: 'Product change history' },
      handler: async (ctx) => s.products.history(ctx.params.id),
    }),
    route({
      method: 'PATCH',
      path: '/admin/products/:id/approve',
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams },
      docs: { ...t('Products'), summary: 'Approve product' },
      handler: async (ctx) => reply.ok(await s.products.approve(ctx.params.id, actorOf(ctx)), 'Product approved'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/products/:id/reject',
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: productRejectSchema },
      docs: { ...t('Products'), summary: 'Reject product with a reason' },
      handler: async (ctx) => reply.ok(await s.products.reject(ctx.params.id, ctx.body.reason, actorOf(ctx)), 'Product rejected'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/products/:id/suspend',
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: productRejectSchema },
      docs: { ...t('Products'), summary: 'Suspend a live product' },
      handler: async (ctx) => reply.ok(await s.products.suspend(ctx.params.id, ctx.body.reason, actorOf(ctx)), 'Product suspended'),
    }),
    route({
      method: 'PATCH',
      path: '/admin/products/:id/feature',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: z.object({ isFeatured: z.boolean() }) },
      docs: { ...t('Products'), summary: 'Feature/unfeature a product' },
      handler: async (ctx) => {
        await s.products.setFeatured(ctx.params.id, ctx.body.isFeatured, actorOf(ctx));
        return reply.ok(null, ctx.body.isFeatured ? 'Product featured' : 'Product unfeatured');
      },
    }),
    route({
      method: 'POST',
      path: '/admin/products/:id/images',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams },
      upload: { maxFiles: 10, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: 'image' },
      docs: { ...t('Products'), summary: 'Upload images to any product' },
      handler: async (ctx) => reply.ok(await s.products.addImages(ctx.params.id, ctx.files, adminScope, actorOf(ctx)), 'Images uploaded'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/products/:id/images/:imageId',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: z.object({ id: idSchema, imageId: idSchema }) },
      docs: { ...t('Products'), summary: 'Remove an image' },
      handler: async (ctx) => reply.ok(await s.products.removeImage(ctx.params.id, ctx.params.imageId, adminScope, actorOf(ctx)), 'Image removed'),
    }),
    route({
      method: 'PUT',
      path: '/admin/products/:id/images',
      ...A,
      permissions: [P.PRODUCTS_MANAGE_ALL],
      schema: { params: idParams, body: z.object({ imageIds: z.array(idSchema).max(10) }) },
      docs: { ...t('Products'), summary: 'Reorder product images' },
      handler: async (ctx) => s.products.reorderImages(ctx.params.id, ctx.body.imageIds, adminScope),
    }),
    route({
      method: 'PATCH',
      path: '/admin/listings/:id/decision',
      ...A,
      permissions: [P.PRODUCTS_APPROVE],
      schema: { params: idParams, body: z.object({ approve: z.boolean(), reason: z.string().max(1000).optional() }) },
      docs: { ...t('Products'), summary: 'Approve/reject a seller offer on an existing product' },
      handler: async (ctx) => {
        await s.products.decideListing(ctx.params.id, ctx.body.approve, ctx.body.reason, actorOf(ctx));
        return reply.ok(null, ctx.body.approve ? 'Offer approved' : 'Offer rejected');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/inventory',
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { query: paginationQuerySchema.extend({ filter: z.enum(['all', 'low', 'out']).default('all') }) },
      docs: { ...t('Inventory'), summary: 'Stock across all sellers' },
      handler: async (ctx) => s.inventory.list({ sellerId: null }, ctx.query),
    }),
    route({
      method: 'PATCH',
      path: '/admin/inventory/:id',
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { params: idParams, body: inventoryAdjustSchema },
      docs: { ...t('Inventory'), summary: 'Adjust any listing’s stock (audited)' },
      handler: async (ctx) => reply.ok(await s.inventory.adjust(ctx.params.id, ctx.body, actorOf(ctx), { sellerId: null }), 'Stock updated'),
    }),
    route({
      method: 'GET',
      path: '/admin/inventory/:id/movements',
      ...A,
      permissions: [P.INVENTORY_MANAGE_ALL],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t('Inventory'), summary: 'Movement history' },
      handler: async (ctx) => s.inventory.movements(ctx.params.id, { sellerId: null }, ctx.query.page, ctx.query.pageSize),
    }),
  ];

  const orders = [
    route({
      method: 'GET',
      path: '/admin/orders',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: orderListQuerySchema.extend({ paymentStatus: z.string().max(20).optional() }) },
      docs: { ...t('Orders'), summary: 'All orders' },
      handler: async (ctx) => s.orderQueries.adminOrders(ctx.query),
    }),
    route({
      method: 'GET',
      path: '/admin/orders/:id',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t('Orders'), summary: 'Full order incl. commissions, payments, refunds' },
      handler: async (ctx) => s.orderQueries.adminOrder(ctx.params.id),
    }),
    route({
      method: 'GET',
      path: '/admin/seller-orders/:id',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t('Orders'), summary: 'Sub-order detail' },
      handler: async (ctx) => s.orderQueries.sellerOrder(ctx.params.id, { sellerId: null }),
    }),
    route({
      method: 'PATCH',
      path: '/admin/seller-orders/:id/status',
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: sellerOrderStatusSchema },
      docs: { ...t('Orders'), summary: 'Update any sub-order (overrides seller restrictions)' },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.fulfillment.updateSellerOrderStatus(ctx.params.id, status, rest, adminScope, actorOf(ctx)), 'Order updated');
      },
    }),
    route({
      method: 'POST',
      path: '/admin/seller-orders/:id/cod-collected',
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: z.object({ reference: z.string().max(120).optional() }) },
      docs: { ...t('Orders'), summary: 'Confirm COD cash received — credits the seller ledger' },
      handler: async (ctx) => {
        await s.fulfillment.confirmCodCollection(ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(null, 'Cash collection confirmed');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/seller-orders/:id/packing-slip',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { params: idParams },
      docs: { ...t('Orders'), summary: 'Packing slip' },
      handler: async (ctx) => reply.html(await s.orderQueries.packingSlip(ctx.params.id, { sellerId: null }, (await s.settings.get('branding')).name)),
    }),
    route({
      method: 'GET',
      path: '/admin/cod/pending',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema },
      docs: { ...t('Orders'), summary: 'Delivered COD sub-orders awaiting cash reconciliation' },
      handler: async (ctx) => s.orderQueries.codPending(ctx.query),
    }),
    route({
      method: 'GET',
      path: '/admin/returns',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema.extend({ status: z.string().max(20).optional() }) },
      docs: { ...t('Orders'), summary: 'All return requests' },
      handler: async (ctx) => s.orderQueries.returns({ sellerId: null }, ctx.query),
    }),
    route({
      method: 'PATCH',
      path: '/admin/returns/:id',
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: { params: idParams, body: returnDecisionSchema },
      docs: { ...t('Orders'), summary: 'Decide or receive a return' },
      handler: async (ctx) => {
        await s.fulfillment.decideReturn(ctx.params.id, ctx.body, adminScope, actorOf(ctx));
        return reply.ok(null, 'Return updated');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/refunds',
      ...A,
      permissions: [P.ORDERS_READ_ALL],
      schema: { query: paginationQuerySchema.extend({ status: z.string().max(20).optional() }) },
      docs: { ...t('Orders'), summary: 'Refunds' },
      handler: async (ctx) => s.orderQueries.refunds(ctx.query),
    }),
    route({
      method: 'PATCH',
      path: '/admin/refunds/:id',
      ...A,
      permissions: [P.ORDERS_MANAGE_ALL],
      schema: {
        params: idParams,
        body: z.object({ reference: z.string().max(120).optional(), method: z.string().max(40).optional(), failed: z.boolean().default(false), note: z.string().max(500).optional() }),
      },
      docs: { ...t('Orders'), summary: 'Record a refund payout (manual; no automatic transfers)' },
      handler: async (ctx) => {
        await s.fulfillment.processRefund(ctx.params.id, ctx.body, actorOf(ctx));
        return reply.ok(null, ctx.body.failed ? 'Refund marked failed' : 'Refund recorded');
      },
    }),
  ];

  const finance = [
    route({
      method: 'GET',
      path: '/admin/commission-rules',
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { query: z.object({ scope: z.enum(COMMISSION_SCOPES).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t('Finance'), summary: 'Commission rules (precedence: product > seller+category > seller > category > global)' },
      handler: async (ctx) => ({ rules: await s.finance.listRules(ctx.query), defaultPercentage: s.finance.defaultCommissionPercent }),
    }),
    route({
      method: 'POST',
      path: '/admin/commission-rules',
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { body: commissionRuleSchema },
      docs: { ...t('Finance'), summary: 'Create commission rule' },
      handler: async (ctx) => reply.created(await s.finance.createRule(ctx.body, actorOf(ctx)), 'Rule created'),
    }),
    route({
      method: 'PUT',
      path: '/admin/commission-rules/:id',
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { params: idParams, body: commissionRuleSchema },
      docs: { ...t('Finance'), summary: 'Update commission rule (applies to new orders only)' },
      handler: async (ctx) => reply.ok(await s.finance.updateRule(ctx.params.id, ctx.body, actorOf(ctx)), 'Rule updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/commission-rules/:id',
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Finance'), summary: 'Delete commission rule' },
      handler: async (ctx) => {
        await s.finance.deleteRule(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Rule deleted');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/commissions',
      ...A,
      permissions: [P.COMMISSIONS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ status: z.string().max(20).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t('Finance'), summary: 'Item-level commission records' },
      handler: async (ctx) => s.finance.commissions({ sellerId: null }, ctx.query),
    }),
    route({
      method: 'GET',
      path: '/admin/settlements',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ status: z.enum(SETTLEMENT_STATUSES).optional(), sellerId: idSchema.optional() }) },
      docs: { ...t('Finance'), summary: 'Settlements' },
      handler: async (ctx) => s.finance.listSettlements({ sellerId: null }, ctx.query),
    }),
    route({
      method: 'POST',
      path: '/admin/settlements',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { body: createSettlementSchema },
      docs: { ...t('Finance'), summary: 'Create a settlement (≤ available balance)' },
      handler: async (ctx) => reply.created(await s.finance.createSettlement(ctx.body, actorOf(ctx)), 'Settlement created'),
    }),
    route({
      method: 'GET',
      path: '/admin/settlements/:id',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Finance'), summary: 'Settlement detail with transaction trail' },
      handler: async (ctx) => s.finance.settlementDetail(ctx.params.id, { sellerId: null }),
    }),
    route({
      method: 'PATCH',
      path: '/admin/settlements/:id/status',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { params: idParams, body: settlementStatusSchema },
      docs: { ...t('Finance'), summary: 'Approve / process / mark paid (manual payout reference) / fail / cancel' },
      handler: async (ctx) => {
        const { status, ...rest } = ctx.body;
        return reply.ok(await s.finance.changeSettlementStatus(ctx.params.id, status, rest, actorOf(ctx)), 'Settlement updated');
      },
    }),
    route({
      method: 'POST',
      path: '/admin/ledger/adjustments',
      ...A,
      permissions: [P.SETTLEMENTS_MANAGE],
      schema: { body: ledgerAdjustmentSchema },
      docs: { ...t('Finance'), summary: 'Post a manual ledger adjustment (audited)' },
      handler: async (ctx) => reply.created(await s.finance.adjust(ctx.body, actorOf(ctx)), 'Adjustment posted'),
    }),
  ];

  const marketing = [
    route({
      method: 'GET',
      path: '/admin/coupons',
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { query: paginationQuerySchema },
      docs: { ...t('Marketing'), summary: 'Coupons' },
      handler: async (ctx) => s.coupons.list(ctx.query),
    }),
    route({
      method: 'POST',
      path: '/admin/coupons',
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { body: couponSchema },
      docs: { ...t('Marketing'), summary: 'Create coupon' },
      handler: async (ctx) => reply.created(await s.coupons.create(ctx.body, actorOf(ctx)), 'Coupon created'),
    }),
    route({
      method: 'PUT',
      path: '/admin/coupons/:id',
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams, body: couponSchema },
      docs: { ...t('Marketing'), summary: 'Update coupon' },
      handler: async (ctx) => reply.ok(await s.coupons.update(ctx.params.id, ctx.body, actorOf(ctx)), 'Coupon updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/coupons/:id',
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Marketing'), summary: 'Delete coupon' },
      handler: async (ctx) => {
        await s.coupons.remove(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Coupon deleted');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/coupons/:id/usages',
      ...A,
      permissions: [P.COUPONS_MANAGE],
      schema: { params: idParams, query: paginationQuerySchema },
      docs: { ...t('Marketing'), summary: 'Redemptions of a coupon' },
      handler: async (ctx) => s.coupons.usages(ctx.params.id, ctx.query.page, ctx.query.pageSize),
    }),
    ...contentCrud('banners', bannerSchema, {
      list: () => s.content.listBanners(),
      create: (b, a) => s.content.createBanner(b, a),
      update: (id, b, a) => s.content.updateBanner(id, b, a),
      remove: (id, a) => s.content.deleteBanner(id, a),
    }),
    ...contentCrud('home-sections', homeSectionSchema, {
      list: () => s.content.listSections(),
      create: (b, a) => s.content.createSection(b, a),
      update: (id, b, a) => s.content.updateSection(id, b, a),
      remove: (id, a) => s.content.deleteSection(id, a),
    }),
    ...contentCrud('promotions', promotionSchema, {
      list: () => s.content.listPromotions(),
      create: (b, a) => s.content.createPromotion(b, a),
      update: (id, b, a) => s.content.updatePromotion(id, b, a),
      remove: (id, a) => s.content.deletePromotion(id, a),
    }),
    route({
      method: 'POST',
      path: '/admin/uploads/image',
      ...A,
      permissions: [P.CONTENT_MANAGE],
      upload: { maxFiles: 1, maxFileBytes: c.env.UPLOAD_MAX_IMAGE_MB * MB, allowed: 'image' },
      docs: { ...t('Marketing'), summary: 'Upload a banner/category image' },
      handler: async (ctx) => {
        if (!ctx.files[0]) throw badRequest('Choose an image');
        return s.content.uploadImage(ctx.files[0]);
      },
    }),
    route({
      method: 'GET',
      path: '/admin/reviews',
      ...A,
      permissions: [P.REVIEWS_MODERATE],
      schema: {
        query: paginationQuerySchema.extend({
          status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REMOVED']).optional(),
          reported: z.enum(['true', 'false']).optional(),
        }),
      },
      docs: { ...t('Marketing'), summary: 'Review moderation queue' },
      handler: async (ctx) => ({ ...(await s.reviews.moderationQueue({ ...ctx.query, reported: ctx.query.reported === 'true' })), stats: await s.reviews.stats() }),
    }),
    route({
      method: 'PATCH',
      path: '/admin/reviews/:id',
      ...A,
      permissions: [P.REVIEWS_MODERATE],
      schema: { params: idParams, body: z.object({ status: z.enum(['APPROVED', 'REJECTED', 'REMOVED']), note: z.string().max(500).optional() }) },
      docs: { ...t('Marketing'), summary: 'Approve / reject / remove a review' },
      handler: async (ctx) => {
        await s.reviews.moderate(ctx.params.id, ctx.body.status, ctx.body.note, actorOf(ctx));
        return reply.ok(null, 'Review updated');
      },
    }),
  ];

  const config = [
    route({
      method: 'GET',
      path: '/admin/system/status',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t('Settings'), summary: 'Database connection, schema/migration and data status (password never included)' },
      handler: async () => ({
        database: await databaseStatus(c.db, c.env.DATABASE_URL),
        app: { env: c.env.APP_ENV, framework: c.env.BACKEND_FRAMEWORK, databaseType: c.env.DATABASE_TYPE, orm: c.env.ORM_PROVIDER, storage: c.storage.name, redis: Boolean(c.redis) },
      }),
    }),
    route({
      method: 'GET',
      path: '/admin/settings',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t('Settings'), summary: 'All marketplace settings' },
      handler: async () => s.settings.all(),
    }),
    route({
      method: 'PATCH',
      path: '/admin/settings/:key',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: z.object({ key: z.enum(SETTING_KEYS as [SettingKey, ...SettingKey[]]) }), body: z.record(z.string(), z.unknown()) },
      docs: { ...t('Settings'), summary: 'Update one settings group (partial)' },
      handler: async (ctx) => {
        const before = await s.settings.get(ctx.params.key);
        const next = await s.settings.update(ctx.params.key, ctx.body as never, ctx.auth!.userId);
        await s.audit.record(actorOf(ctx), { action: 'settings.update', entityType: 'SystemSetting', entityId: ctx.params.key, before, after: next });
        await c.cache.delPrefix('home:');
        return reply.ok(next, 'Settings saved');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/shipping/methods',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t('Settings'), summary: 'Shipping methods' },
      handler: async () => s.shipping.methods(),
    }),
    route({
      method: 'PUT',
      path: '/admin/shipping/methods',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: shippingConfigSchema },
      docs: { ...t('Settings'), summary: 'Configure a shipping method' },
      handler: async (ctx) => reply.ok(await s.shipping.upsertMethod(ctx.body, actorOf(ctx)), 'Shipping updated'),
    }),
    route({
      method: 'GET',
      path: '/admin/shipping/pincodes',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { query: z.object({ q: z.string().max(10).optional() }) },
      docs: { ...t('Settings'), summary: 'Serviceable PIN codes (empty = all serviceable)' },
      handler: async (ctx) => s.shipping.listPincodes(ctx.query.q),
    }),
    route({
      method: 'PUT',
      path: '/admin/shipping/pincodes',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: pincodeSchemaInput },
      docs: { ...t('Settings'), summary: 'Add/update a PIN code rule' },
      handler: async (ctx) => reply.ok(await s.shipping.upsertPincode(ctx.body, actorOf(ctx)), 'PIN code saved'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/shipping/pincodes/:id',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Settings'), summary: 'Remove a PIN code rule' },
      handler: async (ctx) => {
        await s.shipping.deletePincode(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'PIN code removed');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/tax',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      docs: { ...t('Settings'), summary: 'Tax configurations' },
      handler: async () => s.tax.list(),
    }),
    route({
      method: 'POST',
      path: '/admin/tax',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { body: taxConfigSchema },
      docs: { ...t('Settings'), summary: 'Create tax rate' },
      handler: async (ctx) => reply.created(await s.tax.create(ctx.body, actorOf(ctx)), 'Tax rate created'),
    }),
    route({
      method: 'PUT',
      path: '/admin/tax/:id',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams, body: taxConfigSchema },
      docs: { ...t('Settings'), summary: 'Update tax rate' },
      handler: async (ctx) => reply.ok(await s.tax.update(ctx.params.id, ctx.body, actorOf(ctx)), 'Tax rate updated'),
    }),
    route({
      method: 'DELETE',
      path: '/admin/tax/:id',
      ...A,
      permissions: [P.SETTINGS_MANAGE],
      schema: { params: idParams },
      docs: { ...t('Settings'), summary: 'Delete tax rate' },
      handler: async (ctx) => {
        await s.tax.remove(ctx.params.id, actorOf(ctx));
        return reply.ok(null, 'Tax rate deleted');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/notification-templates',
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      docs: { ...t('Settings'), summary: 'Notification templates with overrides' },
      handler: async () => s.notifications.listTemplates(),
    }),
    route({
      method: 'PUT',
      path: '/admin/notification-templates/:key/:channel',
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      schema: { params: z.object({ key: z.string().max(80), channel: z.enum(['IN_APP', 'EMAIL', 'SMS']) }), body: notificationTemplateSchema },
      docs: { ...t('Settings'), summary: 'Override a notification template' },
      handler: async (ctx) => {
        const row = await s.notifications.upsertTemplate(ctx.params.key, ctx.params.channel, ctx.body);
        await s.audit.record(actorOf(ctx), { action: 'notification.template', entityType: 'NotificationTemplate', entityId: row.id, after: ctx.body });
        return reply.ok(row, 'Template saved');
      },
    }),
    route({
      method: 'GET',
      path: '/admin/outbox',
      ...A,
      permissions: [P.NOTIFICATIONS_MANAGE],
      schema: { query: paginationQuerySchema.extend({ recipient: z.string().max(191).optional() }) },
      docs: { ...t('Settings'), summary: 'Outbound email/SMS log (development mail preview)' },
      handler: async (ctx) => s.notifications.outbox(ctx.query.page, ctx.query.pageSize, ctx.query.recipient),
    }),
  ];

  function contentCrud<S extends z.ZodType>(
    name: string,
    schema: S,
    ops: {
      list: () => Promise<unknown>;
      create: (b: z.output<S>, a: ReturnType<typeof actorOf>) => Promise<unknown>;
      update: (id: string, b: z.output<S>, a: ReturnType<typeof actorOf>) => Promise<unknown>;
      remove: (id: string, a: ReturnType<typeof actorOf>) => Promise<void>;
    },
  ) {
    const docs = t('Content');
    return [
      route({ method: 'GET', path: `/admin/${name}`, ...A, permissions: [P.CONTENT_MANAGE], docs: { ...docs, summary: `List ${name}` }, handler: async () => ops.list() }),
      route({
        method: 'POST',
        path: `/admin/${name}`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { body: schema },
        docs: { ...docs, summary: `Create ${name}` },
        handler: async (ctx) => reply.created(await ops.create(ctx.body as z.output<S>, actorOf(ctx)), 'Saved'),
      }),
      route({
        method: 'PUT',
        path: `/admin/${name}/:id`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { params: idParams, body: schema },
        docs: { ...docs, summary: `Update ${name}` },
        handler: async (ctx) => reply.ok(await ops.update(ctx.params.id, ctx.body as z.output<S>, actorOf(ctx)), 'Saved'),
      }),
      route({
        method: 'DELETE',
        path: `/admin/${name}/:id`,
        ...A,
        permissions: [P.CONTENT_MANAGE],
        schema: { params: idParams },
        docs: { ...docs, summary: `Delete ${name}` },
        handler: async (ctx) => {
          await ops.remove(ctx.params.id, actorOf(ctx));
          return reply.ok(null, 'Deleted');
        },
      }),
    ];
  }

  return [...dashboard, ...users, ...sellers, ...products, ...orders, ...finance, ...marketing, ...config];
}
