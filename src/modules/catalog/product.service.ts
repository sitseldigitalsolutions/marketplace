import { Prisma, type PrismaClient, type ProductStatus } from '@prisma/client';
import type { ProductUpsertInput } from '@vyora/shared';
import type { StorageProvider } from '../../infrastructure/storage';
import { storeOptimizedImage } from '../../infrastructure/storage';
import type { UploadedFile } from '../../http/types';
import { badRequest, businessRule, conflict, forbidden, notFound } from '../../shared/errors';
import { decimal, num, toPaise } from '../../shared/money';
import { pageArgs, paginated } from '../../shared/pagination';
import { plainText, slugify } from '../../shared/text';
import { randomCode } from '../../shared/crypto';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { InventoryService } from '../inventory/inventory.service';
import type { NotificationService } from '../notifications/notification.service';
import type { SettingsService } from '../settings/settings.service';
import type { ProductIndexer } from './product-indexer';

/** Who is acting: a seller (always restricted to own products) or an admin (unrestricted). */
export type ProductScope = { kind: 'seller'; sellerId: string } | { kind: 'admin' };

const MAX_IMAGES = 10;

const managedInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  ownerSeller: { select: { id: true, displayName: true, slug: true, status: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  attributeValues: { include: { attribute: { select: { id: true, name: true, code: true } } } },
  variants: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

const variantName = (options: Record<string, string>) => {
  const values = Object.values(options).filter(Boolean);
  return values.length ? values.join(' / ').slice(0, 160) : 'Default';
};

export class ProductService {
  constructor(
    private readonly db: PrismaClient,
    private readonly storage: StorageProvider,
    private readonly inventory: InventoryService,
    private readonly indexer: ProductIndexer,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────
  private async uniqueSlug(title: string) {
    const base = slugify(title) || 'product';
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomCode(5).toLowerCase()}`;
      if (!(await this.db.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * Load a product the caller may manage. Sellers only see products they own — any other ID
   * yields 404 (not 403) so the existence of other sellers' products is never revealed.
   */
  private async loadManaged(productId: string, scope: ProductScope) {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        ...(scope.kind === 'seller' ? { ownerSellerId: scope.sellerId } : {}),
      },
      include: managedInclude,
    });
    if (!product) throw notFound('Product');
    return product;
  }

  private async assertSellerCanList(sellerId: string, submitting: boolean) {
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { status: true, deletedAt: true } });
    if (!seller || seller.deletedAt) throw notFound('Seller');
    if (['SUSPENDED', 'REJECTED', 'INACTIVE'].includes(seller.status)) {
      throw forbidden(`Your seller account is ${seller.status.toLowerCase().replace('_', ' ')} and cannot create or change listings`);
    }
    if (submitting && seller.status !== 'APPROVED') {
      throw forbidden('Your seller account must be approved before products can be submitted for sale');
    }
  }

  private async validateRefs(input: ProductUpsertInput) {
    const category = await this.db.category.findFirst({ where: { id: input.categoryId, deletedAt: null, isActive: true } });
    if (!category) throw badRequest('Choose a valid category', [{ path: 'categoryId', message: 'Unknown category' }]);
    if (input.brandId) {
      const brand = await this.db.brand.findFirst({ where: { id: input.brandId, deletedAt: null } });
      if (!brand) throw badRequest('Choose a valid brand', [{ path: 'brandId', message: 'Unknown brand' }]);
    }
    if (input.attributes.length) {
      const ids = [...new Set(input.attributes.map((a) => a.attributeId))];
      const found = await this.db.productAttribute.count({ where: { id: { in: ids } } });
      if (found !== ids.length) throw badRequest('Unknown product attribute');
    }
    const skus = input.variants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) throw badRequest('Each variant needs a unique SKU');
    return category;
  }

  private async assertSkusFree(sellerId: string, variants: ProductUpsertInput['variants'], productId?: string) {
    const clash = await this.db.sellerProductListing.findFirst({
      where: {
        sellerId,
        sku: { in: variants.map((v) => v.sku) },
        ...(productId ? { NOT: { productId } } : {}),
      },
      select: { sku: true },
    });
    if (clash) throw conflict(`SKU "${clash.sku}" is already used by another of your products`);
  }

  private contentData(input: ProductUpsertInput) {
    return {
      title: plainText(input.title)!,
      description: plainText(input.description)!,
      highlights: input.highlights.map((h) => plainText(h)!),
      specifications: input.specifications.map((s) => ({ key: plainText(s.key)!, value: plainText(s.value)! })),
      tags: input.tags.map((t) => t.toLowerCase()),
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      hsnCode: input.hsnCode ?? null,
      isReturnable: input.isReturnable,
      returnWindowDays: input.isReturnable ? input.returnWindowDays : 0,
      codAvailable: input.codAvailable,
      videoUrl: input.videoUrl ?? null,
    };
  }

  // ── Create ────────────────────────────────────────────────
  async create(sellerId: string, input: ProductUpsertInput, actor: AuditActor, byAdmin = false) {
    if (!byAdmin) await this.assertSellerCanList(sellerId, input.submit);
    // Images are uploaded after the product exists, so a brand-new product is always a draft
    // unless an admin creates it (admins may publish directly after adding images).
    if (input.submit && !byAdmin) {
      throw businessRule('Save the product as a draft, add images, then submit it for review');
    }
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants);
    const status: ProductStatus = input.submit ? 'PENDING_REVIEW' : 'DRAFT';
    const slug = await this.uniqueSlug(input.title);

    const product = await this.db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...this.contentData(input),
          slug,
          searchText: input.title,
          ownerSellerId: sellerId,
          status,
          submittedAt: input.submit ? new Date() : null,
        },
      });
      await this.writeAttributes(tx, p.id, input);
      for (const [i, v] of input.variants.entries()) {
        await this.createVariant(tx, p.id, sellerId, v, i, status, actor);
      }
      if (input.submit) {
        await tx.productApproval.create({
          data: { productId: p.id, fromStatus: null, toStatus: 'PENDING_REVIEW', actorId: actor?.auth?.userId ?? null },
        });
      }
      await this.audit.record(
        actor,
        { action: byAdmin ? 'product.create_on_behalf' : 'product.create', entityType: 'Product', entityId: p.id, after: { ...input, sellerId } },
        tx,
      );
      await this.indexer.reindexSearch(p.id, tx);
      return p;
    });
    return this.getManaged(product.id, byAdmin ? { kind: 'admin' } : { kind: 'seller', sellerId });
  }

  private async writeAttributes(tx: Prisma.TransactionClient, productId: string, input: ProductUpsertInput) {
    await tx.productAttributeValue.deleteMany({ where: { productId, variantId: null } });
    if (input.attributes.length) {
      await tx.productAttributeValue.createMany({
        data: input.attributes.map((a) => ({ productId, attributeId: a.attributeId, value: plainText(a.value)! })),
      });
    }
  }

  private async createVariant(
    tx: Prisma.TransactionClient,
    productId: string,
    sellerId: string,
    v: ProductUpsertInput['variants'][number],
    index: number,
    status: ProductStatus,
    actor: AuditActor,
  ) {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: variantName(v.options),
        options: v.options,
        isDefault: index === 0,
        sortOrder: index,
        weightGrams: v.weightGrams ?? null,
        lengthCm: v.lengthCm ?? null,
        widthCm: v.widthCm ?? null,
        heightCm: v.heightCm ?? null,
      },
    });
    const listing = await tx.sellerProductListing.create({
      data: {
        sellerId,
        productId,
        variantId: variant.id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        price: decimal(toPaise(v.price)),
        mrp: decimal(toPaise(v.mrp)),
        status,
        isActive: v.isActive,
      },
    });
    await this.inventory.initialize(tx, listing.id, sellerId, v.stock, v.lowStockThreshold, {
      reason: 'Initial stock',
      actorId: actor?.auth?.userId,
      referenceType: 'PRODUCT',
      referenceId: productId,
    });
    await this.writeVariantAxes(tx, productId, variant.id, v.options);
    return { variant, listing };
  }

  /** Variant option values are also stored as attribute values so they are filterable. */
  private async writeVariantAxes(tx: Prisma.TransactionClient, productId: string, variantId: string, options: Record<string, string>) {
    await tx.productAttributeValue.deleteMany({ where: { variantId } });
    const codes = Object.keys(options);
    if (!codes.length) return;
    const attrs = await tx.productAttribute.findMany({ where: { code: { in: codes }, isVariantAxis: true } });
    const rows = attrs
      .filter((a) => options[a.code])
      .map((a) => ({ productId, variantId, attributeId: a.id, value: options[a.code] }));
    if (rows.length) await tx.productAttributeValue.createMany({ data: rows });
  }

  // ── Update ────────────────────────────────────────────────
  async update(productId: string, input: ProductUpsertInput, scope: ProductScope, actor: AuditActor) {
    const before = await this.loadManaged(productId, scope);
    if (before.status === 'ARCHIVED') throw businessRule('Archived products cannot be edited');
    const sellerId = before.ownerSellerId;
    if (!sellerId) throw businessRule('Product has no owning seller');
    if (scope.kind === 'seller') await this.assertSellerCanList(sellerId, input.submit);
    await this.validateRefs(input);
    await this.assertSkusFree(sellerId, input.variants, productId);

    const listings = await this.db.sellerProductListing.findMany({
      where: { productId, sellerId, deletedAt: null },
      include: { inventory: true },
    });
    const byVariant = new Map(listings.map((l) => [l.variantId, l]));
    const inputIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id!));
    for (const id of inputIds) {
      if (!before.variants.some((v) => v.id === id)) throw badRequest('Unknown variant for this product');
    }

    // Did customer-visible content change? Price/stock edits are operational and never need review.
    const content = this.contentData(input);
    const contentChanged =
      content.title !== before.title ||
      content.description !== before.description ||
      content.categoryId !== before.categoryId ||
      content.brandId !== before.brandId ||
      JSON.stringify(content.specifications) !== JSON.stringify(before.specifications ?? []) ||
      JSON.stringify(content.highlights) !== JSON.stringify(before.highlights ?? []) ||
      input.variants.some((v) => !v.id) ||
      before.variants.some((v) => !inputIds.has(v.id));

    const settings = await this.settings.get('catalog');
    let nextStatus: ProductStatus = before.status;
    if (input.submit && ['DRAFT', 'REJECTED'].includes(before.status)) nextStatus = 'PENDING_REVIEW';
    else if (
      scope.kind === 'seller' &&
      before.status === 'APPROVED' &&
      contentChanged &&
      settings.productChangesRequireReapproval
    ) {
      nextStatus = 'PENDING_REVIEW';
    }
    if (nextStatus === 'PENDING_REVIEW' && before.status !== 'PENDING_REVIEW' && before.images.length === 0) {
      throw businessRule('Add at least one product image before submitting for review');
    }

    await this.db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...content,
          status: nextStatus,
          rejectionReason: nextStatus === 'PENDING_REVIEW' ? null : undefined,
          submittedAt: nextStatus === 'PENDING_REVIEW' && before.status !== 'PENDING_REVIEW' ? new Date() : undefined,
        },
      });
      await this.writeAttributes(tx, productId, input);

      for (const [i, v] of input.variants.entries()) {
        if (!v.id) {
          await this.createVariant(tx, productId, sellerId, v, before.variants.length + i, nextStatus, actor);
          continue;
        }
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            name: variantName(v.options),
            options: v.options,
            sortOrder: i,
            weightGrams: v.weightGrams ?? null,
            lengthCm: v.lengthCm ?? null,
            widthCm: v.widthCm ?? null,
            heightCm: v.heightCm ?? null,
          },
        });
        await this.writeVariantAxes(tx, productId, v.id, v.options);
        const listing = byVariant.get(v.id);
        if (!listing) continue;
        await tx.sellerProductListing.update({
          where: { id: listing.id },
          data: {
            sku: v.sku,
            barcode: v.barcode ?? null,
            price: decimal(toPaise(v.price)),
            mrp: decimal(toPaise(v.mrp)),
            isActive: v.isActive,
            ...(nextStatus !== before.status && listing.status !== 'ARCHIVED' ? { status: nextStatus } : {}),
          },
        });
        if (listing.inventory && listing.inventory.quantity !== v.stock) {
          await this.inventory.adjust(
            listing.id,
            { setTo: v.stock, reason: 'Updated from product editor', lowStockThreshold: v.lowStockThreshold },
            actor,
            { sellerId: scope.kind === 'seller' ? sellerId : null },
            'ADJUSTMENT',
            tx,
          );
        } else if (listing.inventory && listing.inventory.lowStockThreshold !== v.lowStockThreshold) {
          await tx.inventory.update({ where: { id: listing.inventory.id }, data: { lowStockThreshold: v.lowStockThreshold } });
        }
      }

      // Variants removed from the form are retired (kept for order history).
      const removed = before.variants.filter((v) => !inputIds.has(v.id));
      for (const v of removed) {
        await tx.productVariant.update({ where: { id: v.id }, data: { deletedAt: new Date() } });
        const listing = byVariant.get(v.id);
        if (listing) {
          await tx.sellerProductListing.update({ where: { id: listing.id }, data: { status: 'ARCHIVED', deletedAt: new Date(), isActive: false } });
          await tx.cartItem.deleteMany({ where: { listingId: listing.id } });
        }
      }
      if (nextStatus !== before.status) {
        await tx.productApproval.create({
          data: {
            productId,
            fromStatus: before.status,
            toStatus: nextStatus,
            actorId: actor?.auth?.userId ?? null,
            reason: nextStatus === 'PENDING_REVIEW' && before.status === 'APPROVED' ? 'Content changed; re-review required' : null,
          },
        });
      }
      await this.audit.record(
        actor,
        {
          action: scope.kind === 'admin' ? 'product.admin_update' : 'product.update',
          entityType: 'Product',
          entityId: productId,
          before,
          after: { ...input, status: nextStatus },
        },
        tx,
      );
      await this.indexer.reindexSearch(productId, tx);
    });
    await this.indexer.refresh([productId]);
    return this.getManaged(productId, scope);
  }

  async submit(productId: string, scope: ProductScope, actor: AuditActor) {
    const p = await this.loadManaged(productId, scope);
    if (!['DRAFT', 'REJECTED'].includes(p.status)) throw businessRule(`A ${p.status.toLowerCase()} product cannot be submitted`);
    if (scope.kind === 'seller') await this.assertSellerCanList(scope.sellerId, true);
    if (p.images.length === 0) throw businessRule('Add at least one product image before submitting for review');
    await this.transition(p.id, p.status, 'PENDING_REVIEW', actor, null, true);
    return this.getManaged(productId, scope);
  }

  /** Seller on/off switch for their approved listings on this product. */
  async setActive(productId: string, sellerId: string, isActive: boolean, actor: AuditActor) {
    const listings = await this.db.sellerProductListing.findMany({ where: { productId, sellerId, deletedAt: null } });
    if (!listings.length) throw notFound('Product');
    if (isActive) {
      const seller = await this.db.seller.findUnique({ where: { id: sellerId } });
      if (seller?.status !== 'APPROVED') throw forbidden('Only approved sellers can activate listings');
    }
    await this.db.sellerProductListing.updateMany({ where: { productId, sellerId, deletedAt: null }, data: { isActive } });
    await this.audit.record(actor, { action: isActive ? 'product.activate' : 'product.deactivate', entityType: 'Product', entityId: productId });
    await this.indexer.refresh([productId]);
  }

  /** Soft delete. Order history keeps its snapshots. */
  async archive(productId: string, scope: ProductScope, actor: AuditActor) {
    const p = await this.loadManaged(productId, scope);
    await this.db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: p.id }, data: { status: 'ARCHIVED', deletedAt: new Date(), isFeatured: false } });
      const listings = await tx.sellerProductListing.findMany({ where: { productId: p.id }, select: { id: true } });
      await tx.sellerProductListing.updateMany({
        where: { productId: p.id },
        data: { status: 'ARCHIVED', isActive: false, deletedAt: new Date() },
      });
      await tx.cartItem.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
      await tx.productApproval.create({ data: { productId: p.id, fromStatus: p.status, toStatus: 'ARCHIVED', actorId: actor?.auth?.userId ?? null } });
      await this.audit.record(actor, { action: 'product.archive', entityType: 'Product', entityId: p.id, before: p }, tx);
    });
    await this.indexer.refresh([p.id]);
  }

  // ── Images ────────────────────────────────────────────────
  async addImages(productId: string, files: UploadedFile[], scope: ProductScope, actor: AuditActor) {
    const p = await this.loadManaged(productId, scope);
    if (!files.length) throw badRequest('Choose at least one image');
    if (p.images.length + files.length > MAX_IMAGES) throw businessRule(`A product can have at most ${MAX_IMAGES} images`);
    const stored = [];
    for (const f of files) stored.push(await storeOptimizedImage(this.storage, 'products', f.buffer, f.mimeType));
    await this.db.productImage.createMany({
      data: stored.map((s, i) => ({
        productId,
        url: s.url,
        storageKey: s.key,
        alt: p.title.slice(0, 200),
        sortOrder: p.images.length + i,
      })),
    });
    await this.onContentChange(p, scope, actor, 'Images added');
    return this.getManaged(productId, scope);
  }

  async removeImage(productId: string, imageId: string, scope: ProductScope, actor: AuditActor) {
    const p = await this.loadManaged(productId, scope);
    const img = p.images.find((i) => i.id === imageId);
    if (!img) throw notFound('Image');
    await this.db.productImage.delete({ where: { id: imageId } });
    if (img.storageKey) {
      await this.storage.delete(img.storageKey, 'public');
      await this.storage.delete(img.storageKey.replace(/\.webp$/, '-sm.webp'), 'public');
    }
    await this.onContentChange(p, scope, actor, 'Image removed');
    return this.getManaged(productId, scope);
  }

  async reorderImages(productId: string, imageIds: string[], scope: ProductScope) {
    const p = await this.loadManaged(productId, scope);
    const known = new Set(p.images.map((i) => i.id));
    if (imageIds.some((id) => !known.has(id))) throw badRequest('Unknown image');
    await this.db.$transaction(imageIds.map((id, i) => this.db.productImage.update({ where: { id }, data: { sortOrder: i } })));
    return this.getManaged(productId, scope);
  }

  private async onContentChange(p: { id: string; status: ProductStatus }, scope: ProductScope, actor: AuditActor, reason: string) {
    const settings = await this.settings.get('catalog');
    if (scope.kind === 'seller' && p.status === 'APPROVED' && settings.productChangesRequireReapproval) {
      await this.transition(p.id, 'APPROVED', 'PENDING_REVIEW', actor, `${reason}; re-review required`, true);
    }
    await this.audit.record(actor, { action: 'product.images', entityType: 'Product', entityId: p.id, metadata: { reason } });
  }

  // ── Status transitions (shared by seller submit and admin moderation) ──────
  private async transition(
    productId: string,
    from: ProductStatus,
    to: ProductStatus,
    actor: AuditActor,
    reason: string | null,
    cascadeOwnerListings: boolean,
  ) {
    await this.db.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id: productId, status: from },
        data: {
          status: to,
          rejectionReason: to === 'REJECTED' || to === 'SUSPENDED' ? reason : null,
          ...(to === 'PENDING_REVIEW' ? { submittedAt: new Date() } : {}),
        },
      });
      if (updated.count !== 1) throw conflict('The product status changed in the meantime. Refresh and try again.');
      if (to === 'APPROVED') {
        await tx.product.updateMany({ where: { id: productId, publishedAt: null }, data: { publishedAt: new Date() } });
      }
      if (cascadeOwnerListings) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { ownerSellerId: true } });
        if (p.ownerSellerId) {
          await tx.sellerProductListing.updateMany({
            where: {
              productId,
              sellerId: p.ownerSellerId,
              deletedAt: null,
              status: { notIn: ['ARCHIVED'] },
            },
            data: { status: to === 'SUSPENDED' ? undefined : to, rejectionReason: to === 'REJECTED' ? reason : null },
          });
        }
      }
      await tx.productApproval.create({
        data: { productId, fromStatus: from, toStatus: to, reason, actorId: actor?.auth?.userId ?? null },
      });
      await this.audit.record(
        actor,
        { action: `product.status.${to.toLowerCase()}`, entityType: 'Product', entityId: productId, before: { status: from }, after: { status: to, reason } },
        tx,
      );
    });
    await this.indexer.refresh([productId]);
  }

  async approve(productId: string, actor: AuditActor) {
    const p = await this.loadManaged(productId, { kind: 'admin' });
    if (!['PENDING_REVIEW', 'REJECTED', 'SUSPENDED', 'DRAFT'].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be approved`);
    }
    await this.transition(p.id, p.status, 'APPROVED', actor, null, true);
    await this.notifyOwner(p.ownerSellerId, 'product.approved', { productName: p.title }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: 'admin' });
  }

  async reject(productId: string, reason: string, actor: AuditActor) {
    const p = await this.loadManaged(productId, { kind: 'admin' });
    if (!['PENDING_REVIEW', 'APPROVED', 'SUSPENDED'].includes(p.status)) {
      throw businessRule(`A ${p.status.toLowerCase()} product cannot be rejected`);
    }
    await this.transition(p.id, p.status, 'REJECTED', actor, reason, true);
    await this.notifyOwner(p.ownerSellerId, 'product.rejected', { productName: p.title, reason }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: 'admin' });
  }

  async suspend(productId: string, reason: string, actor: AuditActor) {
    const p = await this.loadManaged(productId, { kind: 'admin' });
    if (p.status !== 'APPROVED') throw businessRule('Only live products can be suspended');
    await this.transition(p.id, 'APPROVED', 'SUSPENDED', actor, reason, false);
    await this.notifyOwner(p.ownerSellerId, 'product.rejected', { productName: p.title, reason: `Suspended — ${reason}` }, `/seller/products/${p.id}`);
    return this.getManaged(productId, { kind: 'admin' });
  }

  async setFeatured(productId: string, isFeatured: boolean, actor: AuditActor) {
    const p = await this.loadManaged(productId, { kind: 'admin' });
    await this.db.product.update({ where: { id: p.id }, data: { isFeatured } });
    await this.audit.record(actor, { action: 'product.feature', entityType: 'Product', entityId: p.id, after: { isFeatured } });
  }

  private async notifyOwner(sellerId: string | null, key: string, vars: Record<string, unknown>, link: string) {
    if (!sellerId) return;
    const seller = await this.db.seller.findUnique({ where: { id: sellerId }, select: { userId: true } });
    if (seller) await this.notifications.notify({ key, userId: seller.userId, vars, link });
  }

  // ── Offers on existing catalog products (multi-seller) ─────
  async createOffer(
    sellerId: string,
    input: { productId: string; variantId: string; sku: string; price: number; mrp: number; stock: number },
    actor: AuditActor,
  ) {
    await this.assertSellerCanList(sellerId, true);
    const variant = await this.db.productVariant.findFirst({
      where: { id: input.variantId, productId: input.productId, deletedAt: null, product: { status: 'APPROVED', deletedAt: null } },
    });
    if (!variant) throw notFound('Product');
    if (input.price > input.mrp) throw badRequest('Selling price cannot exceed MRP');
    const existing = await this.db.sellerProductListing.findFirst({ where: { sellerId, variantId: variant.id } });
    if (existing) throw conflict('You already sell this variant');
    const settings = await this.settings.get('catalog');
    const status: ProductStatus = settings.autoApproveListingsOnApprovedProducts ? 'APPROVED' : 'PENDING_REVIEW';
    const listing = await this.db.$transaction(async (tx) => {
      const l = await tx.sellerProductListing.create({
        data: {
          sellerId,
          productId: input.productId,
          variantId: variant.id,
          sku: input.sku,
          price: decimal(toPaise(input.price)),
          mrp: decimal(toPaise(input.mrp)),
          status,
        },
      });
      await this.inventory.initialize(tx, l.id, sellerId, input.stock, 5, { reason: 'Initial stock', actorId: actor?.auth?.userId });
      await this.audit.record(actor, { action: 'listing.create', entityType: 'SellerProductListing', entityId: l.id, after: input }, tx);
      return l;
    });
    await this.indexer.reindexSearch(input.productId);
    await this.indexer.refresh([input.productId]);
    return listing;
  }

  async decideListing(listingId: string, approve: boolean, reason: string | undefined, actor: AuditActor) {
    const listing = await this.db.sellerProductListing.findFirst({ where: { id: listingId, deletedAt: null } });
    if (!listing) throw notFound('Listing');
    await this.db.sellerProductListing.update({
      where: { id: listingId },
      data: { status: approve ? 'APPROVED' : 'REJECTED', rejectionReason: approve ? null : (reason ?? null) },
    });
    await this.audit.record(actor, {
      action: approve ? 'listing.approve' : 'listing.reject',
      entityType: 'SellerProductListing',
      entityId: listingId,
      after: { reason },
    });
    await this.indexer.refresh([listing.productId]);
  }

  // ── Reads ─────────────────────────────────────────────────
  async getManaged(productId: string, scope: ProductScope) {
    const product =
      scope.kind === 'admin'
        ? await this.db.product.findFirst({ where: { id: productId }, include: managedInclude })
        : await this.loadManaged(productId, scope);
    if (!product) throw notFound('Product');
    const listings = await this.db.sellerProductListing.findMany({
      where: {
        productId,
        deletedAt: null,
        // Sellers only ever see their own listings on a product.
        ...(scope.kind === 'seller' ? { sellerId: scope.sellerId } : {}),
      },
      include: {
        inventory: true,
        seller: { select: { id: true, displayName: true, slug: true, status: true } },
      },
    });
    const approvals = await this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 20 });
    return {
      ...product,
      listings: listings.map((l) => ({
        ...l,
        price: num(l.price),
        mrp: num(l.mrp),
        stock: l.inventory?.quantity ?? 0,
        reserved: l.inventory?.reserved ?? 0,
        available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0),
        lowStockThreshold: l.inventory?.lowStockThreshold ?? 5,
      })),
      approvals,
    };
  }

  async listManaged(
    scope: ProductScope,
    q: { page: number; pageSize: number; q?: string; status?: ProductStatus; categoryId?: string; sellerId?: string; sort?: string },
  ) {
    const where: Prisma.ProductWhereInput = {
      ...(q.status === 'ARCHIVED' ? {} : { deletedAt: null }),
      ...(q.status ? { status: q.status } : { status: { not: 'ARCHIVED' } }),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(scope.kind === 'seller'
        ? { OR: [{ ownerSellerId: scope.sellerId }, { listings: { some: { sellerId: scope.sellerId, deletedAt: null } } }] }
        : q.sellerId
          ? { OR: [{ ownerSellerId: q.sellerId }, { listings: { some: { sellerId: q.sellerId } } }] }
          : {}),
      ...(q.q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q.q } },
                  { listings: { some: { sku: { contains: q.q }, ...(scope.kind === 'seller' ? { sellerId: scope.sellerId } : {}) } } },
                ],
              },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'oldest'
        ? { createdAt: 'asc' }
        : q.sort === 'title'
          ? { title: 'asc' }
          : q.sort === 'submitted'
            ? { submittedAt: 'asc' }
            : { updatedAt: 'desc' };
    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy,
        ...pageArgs(q.page, q.pageSize),
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          ownerSeller: { select: { id: true, displayName: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          listings: {
            where: { deletedAt: null, ...(scope.kind === 'seller' ? { sellerId: scope.sellerId } : {}) },
            select: { id: true, sku: true, price: true, mrp: true, status: true, isActive: true, sellerId: true, inventory: { select: { quantity: true, reserved: true } } },
          },
        },
      }),
      this.db.product.count({ where }),
    ]);
    return paginated(
      items.map((p) => ({
        ...p,
        searchText: undefined,
        listings: p.listings.map((l) => ({
          ...l,
          price: num(l.price),
          mrp: num(l.mrp),
          available: (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0),
        })),
        totalStock: p.listings.reduce((s, l) => s + (l.inventory?.quantity ?? 0), 0),
        isOwner: scope.kind === 'seller' ? p.ownerSellerId === scope.sellerId : undefined,
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async history(productId: string) {
    await this.loadManaged(productId, { kind: 'admin' });
    const [approvals, audit] = await Promise.all([
      this.db.productApproval.findMany({ where: { productId }, orderBy: { createdAt: 'desc' } }),
      this.db.auditLog.findMany({
        where: { entityType: 'Product', entityId: productId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    return { approvals, audit };
  }

  /** Counts for the seller dashboard / admin review queue. */
  async statusCounts(scope: ProductScope) {
    const rows = await this.db.product.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...(scope.kind === 'seller' ? { ownerSellerId: scope.sellerId } : {}) },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<ProductStatus, number>>;
  }
}

export { Prisma };
