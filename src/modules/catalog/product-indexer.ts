import type { Prisma, PrismaClient } from '@prisma/client';
import type { Db } from '../../database/prisma/client';
import type { CacheProvider } from '../../infrastructure/cache';

/** SQL-free definition of a listing a customer can buy right now (stock checked separately). */
export const purchasableListingWhere = {
  status: 'APPROVED',
  isActive: true,
  deletedAt: null,
  seller: { status: 'APPROVED', deletedAt: null },
  product: { status: 'APPROVED', deletedAt: null },
  variant: { deletedAt: null },
} satisfies Prisma.SellerProductListingWhereInput;

/**
 * Maintains denormalised read-model fields on Product (minPrice, maxMrp, discount, inStock,
 * searchText). A product with `minPrice = null` has no purchasable offer and is hidden from
 * the storefront.
 */
export class ProductIndexer {
  constructor(
    private readonly db: PrismaClient,
    private readonly cache: CacheProvider,
  ) {}

  async refresh(productIds: string[], db: Db = this.db) {
    const ids = [...new Set(productIds)].filter(Boolean);
    for (const productId of ids) {
      const listings = await db.sellerProductListing.findMany({
        where: { productId, ...purchasableListingWhere },
        select: { price: true, mrp: true, inventory: { select: { quantity: true, reserved: true } } },
      });
      let minPrice: number | null = null;
      let maxMrp: number | null = null;
      let maxDiscount = 0;
      let inStock = false;
      let minInStockPrice: number | null = null;
      for (const l of listings) {
        const price = Number(l.price);
        const mrp = Number(l.mrp);
        const available = (l.inventory?.quantity ?? 0) - (l.inventory?.reserved ?? 0);
        if (available > 0) {
          inStock = true;
          minInStockPrice = minInStockPrice === null ? price : Math.min(minInStockPrice, price);
        }
        minPrice = minPrice === null ? price : Math.min(minPrice, price);
        maxMrp = maxMrp === null ? mrp : Math.max(maxMrp, mrp);
        if (mrp > price) maxDiscount = Math.max(maxDiscount, Math.round(((mrp - price) / mrp) * 100));
      }
      await db.product.update({
        where: { id: productId },
        data: {
          minPrice: minInStockPrice ?? minPrice,
          maxMrp,
          maxDiscountPct: maxDiscount,
          inStock,
        },
      });
    }
    if (ids.length) await this.cache.delPrefix('home:');
  }

  async refreshForSeller(sellerId: string) {
    const rows = await this.db.sellerProductListing.findMany({
      where: { sellerId },
      select: { productId: true },
      distinct: ['productId'],
    });
    await this.refresh(rows.map((r) => r.productId));
  }

  /** Rebuild the full-text search document for a product. */
  async reindexSearch(productId: string, db: Db = this.db) {
    const p = await db.product.findUnique({
      where: { id: productId },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        listings: { where: { deletedAt: null }, select: { sku: true, barcode: true } },
        attributeValues: { select: { value: true } },
        variants: { where: { deletedAt: null }, select: { name: true } },
      },
    });
    if (!p) return;
    const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
    const parts = [
      p.title,
      p.brand?.name,
      p.category.name,
      ...tags,
      ...p.listings.flatMap((l) => [l.sku, l.barcode]),
      ...p.attributeValues.map((a) => a.value),
      ...p.variants.map((v) => v.name),
    ].filter(Boolean);
    await db.product.update({ where: { id: productId }, data: { searchText: [...new Set(parts)].join(' ').slice(0, 60000) } });
  }
}
