import type { InventoryMovementType, Prisma, PrismaClient } from '@prisma/client';
import type { Db } from '../../database/prisma/client';
import { badRequest, businessRule, notFound, outOfStock } from '../../shared/errors';
import { pageArgs, paginated } from '../../shared/pagination';
import type { AuditActor, AuditService } from '../audit/audit.service';
import type { ProductIndexer } from '../catalog/product-indexer';
import type { NotificationService } from '../notifications/notification.service';

interface Ref {
  referenceType?: string;
  referenceId?: string;
  actorId?: string | null;
  reason?: string;
}

/**
 * Inventory strategy (COD): stock is RESERVED atomically when an order is placed, CONSUMED
 * (quantity and reservation decremented) when the seller ships, and RELEASED if the order is
 * cancelled before shipping. Every mutation is a single conditional UPDATE, so concurrent
 * checkouts can never oversell or drive stock negative. A movement row records each change.
 */
export class InventoryService {
  constructor(
    private readonly db: PrismaClient,
    private readonly indexer: ProductIndexer,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private async movement(
    tx: Db,
    listingId: string,
    type: InventoryMovementType,
    quantityDelta: number,
    reservedDelta: number,
    ref: Ref,
  ) {
    const inv = await tx.inventory.findUniqueOrThrow({ where: { listingId } });
    await tx.inventoryMovement.create({
      data: {
        inventoryId: inv.id,
        type,
        quantityDelta,
        reservedDelta,
        quantityAfter: inv.quantity,
        reservedAfter: inv.reserved,
        reason: ref.reason?.slice(0, 300),
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        actorId: ref.actorId ?? null,
      },
    });
    return inv;
  }

  /** Reserve stock for an order. Throws OUT_OF_STOCK if fewer than `qty` units are available. */
  async reserve(tx: Db, listingId: string, qty: number, ref: Ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved + ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND quantity - reserved >= ${qty}`;
    if (affected !== 1) throw outOfStock('Some items in your cart just went out of stock', [{ listingId }]);
    return this.movement(tx, listingId, 'RESERVE', 0, qty, ref);
  }

  async release(tx: Db, listingId: string, qty: number, ref: Ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty}`;
    if (affected !== 1) throw businessRule('Inventory reservation mismatch', [{ listingId }]);
    return this.movement(tx, listingId, 'RELEASE', 0, -qty, ref);
  }

  /** Convert a reservation into a shipped (consumed) unit. */
  async consume(tx: Db, listingId: string, qty: number, ref: Ref) {
    const affected = await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity - ${qty}, reserved = reserved - ${qty}, updatedAt = NOW(3)
      WHERE listingId = ${listingId} AND reserved >= ${qty} AND quantity >= ${qty}`;
    if (affected !== 1) throw businessRule('Inventory reservation mismatch', [{ listingId }]);
    return this.movement(tx, listingId, 'SHIP', -qty, -qty, ref);
  }

  async restock(tx: Db, listingId: string, qty: number, ref: Ref) {
    await tx.$executeRaw`
      UPDATE \`Inventory\` SET quantity = quantity + ${qty}, updatedAt = NOW(3) WHERE listingId = ${listingId}`;
    return this.movement(tx, listingId, 'RETURN_RESTOCK', qty, 0, ref);
  }

  async initialize(tx: Db, listingId: string, sellerId: string, quantity: number, lowStockThreshold: number, ref: Ref) {
    await tx.inventory.create({ data: { listingId, sellerId, quantity, lowStockThreshold } });
    return this.movement(tx, listingId, 'INITIAL', quantity, 0, ref);
  }

  /**
   * Manual adjustment by a seller (own listings only) or admin. The new on-hand quantity can
   * never fall below the units already reserved for open orders.
   */
  async adjust(
    listingId: string,
    input: { delta?: number; setTo?: number; reason: string; lowStockThreshold?: number },
    actor: AuditActor,
    scope: { sellerId: string | null },
    type: InventoryMovementType = 'ADJUSTMENT',
    tx?: Db,
  ) {
    if (input.delta === undefined && input.setTo === undefined && input.lowStockThreshold === undefined) {
      throw badRequest('Provide delta, setTo or lowStockThreshold');
    }
    const run = async (db: Db) => {
      const inv = await db.inventory.findFirst({
        where: { listingId, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
        include: { listing: { select: { productId: true, sku: true } } },
      });
      if (!inv) throw notFound('Inventory');
      if (input.lowStockThreshold !== undefined) {
        await db.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: input.lowStockThreshold } });
      }
      if (input.delta === undefined && input.setTo === undefined) return inv;
      const target = input.setTo ?? inv.quantity + (input.delta ?? 0);
      if (target < 0) throw businessRule('Stock cannot be negative');
      const affected = await db.$executeRaw`
        UPDATE \`Inventory\` SET quantity = ${target}, updatedAt = NOW(3),
          lowStockAlertedAt = IF(${target} - reserved > lowStockThreshold, NULL, lowStockAlertedAt)
        WHERE id = ${inv.id} AND ${target} >= reserved`;
      if (affected !== 1) {
        throw businessRule(`Stock cannot be set below the ${inv.reserved} unit(s) reserved for open orders`);
      }
      const after = await this.movement(db, listingId, type, target - inv.quantity, 0, {
        reason: input.reason,
        actorId: actor?.auth?.userId,
        referenceType: 'MANUAL',
      });
      await this.audit.record(
        actor,
        {
          action: 'inventory.adjust',
          entityType: 'Inventory',
          entityId: inv.id,
          before: { quantity: inv.quantity, reserved: inv.reserved },
          after: { quantity: after.quantity, reserved: after.reserved },
          metadata: { sku: inv.listing.sku, reason: input.reason },
        },
        db,
      );
      return { ...after, productId: inv.listing.productId, wasAvailable: inv.quantity - inv.reserved };
    };
    // Inside a caller's transaction the caller refreshes read models after commit; doing it here
    // on another connection would block on the caller's row locks.
    if (tx) return run(tx);
    const result = await this.db.$transaction((t) => run(t));
    if ('productId' in result) {
      await this.indexer.refresh([result.productId as string]);
      if ((result.wasAvailable as number) <= 0 && result.quantity - result.reserved > 0) {
        await this.notifyBackInStock(result.productId as string).catch(() => undefined);
      }
    }
    return result;
  }

  async bulkUpdate(sellerId: string, items: Array<{ sku: string; quantity: number }>, reason: string, actor: AuditActor) {
    const results: Array<{ sku: string; ok: boolean; error?: string }> = [];
    for (const item of items) {
      const listing = await this.db.sellerProductListing.findFirst({
        where: { sellerId, sku: item.sku, deletedAt: null },
        select: { id: true },
      });
      if (!listing) {
        results.push({ sku: item.sku, ok: false, error: 'SKU not found' });
        continue;
      }
      try {
        await this.adjust(listing.id, { setTo: item.quantity, reason }, actor, { sellerId }, 'IMPORT');
        results.push({ sku: item.sku, ok: true });
      } catch (err) {
        results.push({ sku: item.sku, ok: false, error: (err as Error).message });
      }
    }
    return { updated: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results };
  }

  async list(
    scope: { sellerId: string | null },
    q: { page: number; pageSize: number; q?: string; filter?: 'low' | 'out' | 'all' },
  ) {
    const where: Prisma.InventoryWhereInput = {
      ...(scope.sellerId ? { sellerId: scope.sellerId } : {}),
      listing: {
        deletedAt: null,
        ...(q.q
          ? { OR: [{ sku: { contains: q.q } }, { product: { title: { contains: q.q } } }] }
          : {}),
      },
    };
    // "available" is derived, so low/out-of-stock filters need SQL on two columns.
    if (q.filter === 'low' || q.filter === 'out') {
      const sellerCond = scope.sellerId ?? null;
      const rows = q.filter === 'out'
        ? await this.db.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond}) AND quantity - reserved <= 0`
        : await this.db.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM \`Inventory\` WHERE (${sellerCond} IS NULL OR sellerId = ${sellerCond})
              AND quantity - reserved > 0 AND quantity - reserved <= lowStockThreshold`;
      where.id = { in: rows.map((r) => r.id) };
    }
    const [items, total] = await Promise.all([
      this.db.inventory.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              sku: true,
              price: true,
              status: true,
              isActive: true,
              variant: { select: { name: true } },
              product: { select: { id: true, title: true, slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
            },
          },
          seller: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.db.inventory.count({ where }),
    ]);
    return paginated(
      items.map((i) => ({ ...i, available: i.quantity - i.reserved, isLow: i.quantity - i.reserved <= i.lowStockThreshold })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async movements(listingId: string, scope: { sellerId: string | null }, page: number, pageSize: number) {
    const inv = await this.db.inventory.findFirst({
      where: { listingId, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
    });
    if (!inv) throw notFound('Inventory');
    const [items, total] = await Promise.all([
      this.db.inventoryMovement.findMany({ where: { inventoryId: inv.id }, orderBy: { createdAt: 'desc' }, ...pageArgs(page, pageSize) }),
      this.db.inventoryMovement.count({ where: { inventoryId: inv.id } }),
    ]);
    return paginated(items, total, page, pageSize);
  }

  /** Alert the seller once when a listing crosses its low-stock threshold (re-armed on restock). */
  async checkLowStock(listingIds: string[]) {
    for (const listingId of listingIds) {
      const inv = await this.db.inventory.findUnique({
        where: { listingId },
        include: { listing: { select: { sku: true, product: { select: { title: true } } } }, seller: { select: { userId: true } } },
      });
      if (!inv) continue;
      const available = inv.quantity - inv.reserved;
      if (available <= inv.lowStockThreshold && !inv.lowStockAlertedAt) {
        const claimed = await this.db.inventory.updateMany({
          where: { id: inv.id, lowStockAlertedAt: null },
          data: { lowStockAlertedAt: new Date() },
        });
        if (claimed.count) {
          await this.notifications.notify({
            key: 'inventory.low_stock',
            userId: inv.seller.userId,
            link: '/seller/inventory?filter=low',
            vars: { sku: inv.listing.sku, productName: inv.listing.product.title, available },
          });
        }
      }
    }
  }

  private async notifyBackInStock(productId: string) {
    const subs = await this.db.stockSubscription.findMany({
      where: { productId, notifiedAt: null },
      include: { product: { select: { title: true, slug: true } } },
      take: 500,
    });
    for (const s of subs) {
      await this.notifications.notify({
        key: 'stock.back_in_stock',
        userId: s.userId,
        link: `/p/${s.product.slug}`,
        vars: { productName: s.product.title },
      });
    }
    if (subs.length) {
      await this.db.stockSubscription.updateMany({ where: { id: { in: subs.map((s) => s.id) } }, data: { notifiedAt: new Date() } });
    }
  }
}
