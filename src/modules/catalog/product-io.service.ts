import type { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { productUpsertSchema } from '@vyora/shared';
import type { UploadedFile } from '../../http/types';
import { badRequest } from '../../shared/errors';
import { decimal, num, toPaise } from '../../shared/money';
import type { AuditActor } from '../audit/audit.service';
import type { InventoryService } from '../inventory/inventory.service';
import type { ProductIndexer } from './product-indexer';
import type { ProductService } from './product.service';

export const IMPORT_COLUMNS = [
  'handle', 'title', 'description', 'category_slug', 'brand_slug', 'sku', 'option1_name', 'option1_value',
  'option2_name', 'option2_value', 'price', 'mrp', 'stock', 'hsn_code', 'returnable', 'return_window_days',
] as const;

type Row = Partial<Record<(typeof IMPORT_COLUMNS)[number], string>>;

const MAX_ROWS = 2000;

/**
 * Bulk import/export of a seller's catalog.
 *  • Rows whose SKU already exists for the seller update price, MRP and stock.
 *  • New SKUs are grouped by `handle` into products (one row per variant), created as drafts.
 */
export class ProductIoService {
  constructor(
    private readonly db: PrismaClient,
    private readonly products: ProductService,
    private readonly inventory: InventoryService,
    private readonly indexer: ProductIndexer,
  ) {}

  private async readRows(file: UploadedFile): Promise<Row[]> {
    if (file.mimeType === 'text/csv') {
      const rows = parse(file.buffer, { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
      return rows as Row[];
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const header = (ws.getRow(1).values as unknown[]).slice(1).map((v) => String(v ?? '').trim().toLowerCase());
    const rows: Row[] = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      const values = (row.values as unknown[]).slice(1);
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        const v = values[i];
        obj[h] = v === null || v === undefined ? '' : typeof v === 'object' && 'text' in (v as object) ? String((v as { text: string }).text) : String(v);
      });
      rows.push(obj as Row);
    });
    return rows;
  }

  template() {
    const sample = [
      ['cotton-kurta', 'Men Cotton Kurta', 'Breathable pure cotton kurta for daily wear.', 'mens-clothing', 'ethnica', 'KURTA-BLU-M', 'size', 'M', 'color', 'Blue', '799', '1299', '25', '6205', 'yes', '7'],
      ['cotton-kurta', '', '', '', '', 'KURTA-BLU-L', 'size', 'L', 'color', 'Blue', '799', '1299', '18', '', '', ''],
    ];
    return Buffer.from(stringify([IMPORT_COLUMNS as unknown as string[], ...sample]));
  }

  async import(sellerId: string, file: UploadedFile, actor: AuditActor) {
    const rows = await this.readRows(file);
    if (!rows.length) throw badRequest('The file has no data rows');
    if (rows.length > MAX_ROWS) throw badRequest(`At most ${MAX_ROWS} rows can be imported at once`);
    const results: Array<{ row: number; sku: string; action: 'updated' | 'created' | 'error'; message?: string }> = [];

    // 1. Existing SKUs → price/stock updates.
    const existing = await this.db.sellerProductListing.findMany({
      where: { sellerId, sku: { in: rows.map((r) => r.sku ?? '').filter(Boolean) }, deletedAt: null },
      include: { inventory: true },
    });
    const bySku = new Map(existing.map((l) => [l.sku, l]));
    const creations = new Map<string, Array<{ row: Row; index: number }>>();
    for (const [i, row] of rows.entries()) {
      const rowNo = i + 2;
      const sku = (row.sku ?? '').trim();
      if (!sku) {
        results.push({ row: rowNo, sku: '', action: 'error', message: 'SKU is required' });
        continue;
      }
      const listing = bySku.get(sku);
      if (listing) {
        try {
          const price = row.price ? Number(row.price) : num(listing.price);
          const mrp = row.mrp ? Number(row.mrp) : num(listing.mrp);
          if (!(price > 0) || !(mrp > 0) || price > mrp) throw new Error('Price must be > 0 and not exceed MRP');
          await this.db.sellerProductListing.update({ where: { id: listing.id }, data: { price: decimal(toPaise(price)), mrp: decimal(toPaise(mrp)) } });
          if (row.stock !== undefined && row.stock !== '' && Number(row.stock) !== listing.inventory?.quantity) {
            await this.inventory.adjust(listing.id, { setTo: Number(row.stock), reason: 'Bulk import' }, actor, { sellerId }, 'IMPORT');
          }
          await this.indexer.refresh([listing.productId]);
          results.push({ row: rowNo, sku, action: 'updated' });
        } catch (err) {
          results.push({ row: rowNo, sku, action: 'error', message: (err as Error).message });
        }
        continue;
      }
      const handle = (row.handle || sku).trim().toLowerCase();
      if (!creations.has(handle)) creations.set(handle, []);
      creations.get(handle)!.push({ row, index: rowNo });
    }

    // 2. New products grouped by handle.
    const categories = new Map((await this.db.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
    const brands = new Map((await this.db.brand.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } })).map((b) => [b.slug, b.id]));
    for (const [handle, group] of creations) {
      const head = group[0].row;
      const variants = group.map(({ row }) => {
        const options: Record<string, string> = {};
        if (row.option1_name && row.option1_value) options[row.option1_name.trim().toLowerCase()] = row.option1_value.trim();
        if (row.option2_name && row.option2_value) options[row.option2_name.trim().toLowerCase()] = row.option2_value.trim();
        return { options, sku: row.sku!.trim(), price: row.price, mrp: row.mrp, stock: row.stock || '0' };
      });
      const parsed = productUpsertSchema.safeParse({
        title: head.title,
        description: head.description,
        categoryId: categories.get((head.category_slug ?? '').trim()) ?? '',
        brandId: head.brand_slug ? (brands.get(head.brand_slug.trim()) ?? null) : null,
        hsnCode: head.hsn_code || undefined,
        isReturnable: !/^(no|false|0)$/i.test(head.returnable ?? 'yes'),
        returnWindowDays: head.return_window_days ? Number(head.return_window_days) : 7,
        variants,
        submit: false,
      });
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? '', action: 'error', message: `${handle}: ${msg}` });
        continue;
      }
      try {
        await this.products.create(sellerId, parsed.data, actor);
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? '', action: 'created' });
      } catch (err) {
        for (const g of group) results.push({ row: g.index, sku: g.row.sku ?? '', action: 'error', message: (err as Error).message });
      }
    }
    results.sort((a, b) => a.row - b.row);
    return {
      total: rows.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      errors: results.filter((r) => r.action === 'error'),
    };
  }

  async export(scope: { sellerId: string | null }, format: 'csv' | 'xlsx') {
    const listings = await this.db.sellerProductListing.findMany({
      where: { deletedAt: null, ...(scope.sellerId ? { sellerId: scope.sellerId } : {}) },
      include: {
        inventory: true,
        variant: true,
        seller: { select: { displayName: true, code: true } },
        product: { include: { category: { select: { slug: true } }, brand: { select: { slug: true } } } },
      },
      orderBy: [{ productId: 'asc' }, { createdAt: 'asc' }],
      take: 50000,
    });
    const header = [...IMPORT_COLUMNS, 'reserved', 'status', 'active', 'product_id', ...(scope.sellerId ? [] : ['seller', 'seller_code'])];
    const rows = listings.map((l) => {
      const opts = Object.entries((l.variant.options ?? {}) as Record<string, string>);
      return [
        l.product.slug, l.product.title, l.product.description, l.product.category.slug, l.product.brand?.slug ?? '', l.sku,
        opts[0]?.[0] ?? '', opts[0]?.[1] ?? '', opts[1]?.[0] ?? '', opts[1]?.[1] ?? '', num(l.price), num(l.mrp),
        l.inventory?.quantity ?? 0, l.product.hsnCode ?? '', l.product.isReturnable ? 'yes' : 'no', l.product.returnWindowDays,
        l.inventory?.reserved ?? 0, l.status, l.isActive ? 'yes' : 'no', l.productId,
        ...(scope.sellerId ? [] : [l.seller.displayName, l.seller.code]),
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const safe = rows.map((r) => r.map((c) => (typeof c === 'string' && /^[=+\-@]/.test(c) ? `'${c}` : c)));
      return { filename: `products-${stamp}.csv`, contentType: 'text/csv; charset=utf-8', data: Buffer.from(stringify([header, ...safe])) };
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.addRow(header).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    return {
      filename: `products-${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: Buffer.from(await wb.xlsx.writeBuffer()),
    };
  }
}
