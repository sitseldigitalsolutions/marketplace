import request from 'supertest';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, type ProductUpsertInput } from '@vyora/shared';
import sharp from 'sharp';
import { loadEnv } from '../src/config/env';
import { createApp, type App } from '../src/app';
import { storeOptimizedImage } from '../src/infrastructure/storage';

let seq = 0;
export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

export async function bootApp(framework: 'express' | 'hapi' = 'express'): Promise<App> {
  const env = loadEnv();
  const app = await createApp(env, { framework });
  await ensureRoles(app);
  return app;
}

async function ensureRoles(app: App) {
  const db = app.container.db;
  for (const code of ALL_PERMISSIONS) await db.permission.upsert({ where: { code }, create: { code }, update: {} });
  const perms = await db.permission.findMany();
  for (const code of ['ADMIN', 'SELLER', 'CUSTOMER'] as const) {
    const role = await db.role.upsert({ where: { code }, create: { code, name: code, isSystem: true }, update: {} });
    await db.rolePermission.createMany({
      data: perms.filter((p) => DEFAULT_ROLE_PERMISSIONS[code].includes(p.code as never)).map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

/** HTTP client with a cookie jar that sends the CSRF header like the web app does. */
export class Client {
  agent: ReturnType<typeof request.agent>;
  csrf = '';
  constructor(private readonly app: App) {
    this.agent = request.agent(app.adapter.httpServer());
  }
  async init() {
    const res = await this.agent.get('/api/v1/auth/csrf');
    this.csrf = res.body.result.csrfToken;
    return this;
  }
  private refreshCsrf(res: request.Response) {
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = cookies.find((x) => x.startsWith('vy_csrf='));
    if (c) this.csrf = decodeURIComponent(c.split(';')[0].slice('vy_csrf='.length));
    return res;
  }
  get(path: string) {
    return this.agent.get(`/api/v1${path}`);
  }
  async send(method: 'post' | 'patch' | 'put' | 'delete', path: string, body?: unknown) {
    const res = await this.agent[method](`/api/v1${path}`).set('x-csrf-token', this.csrf).send(body as object);
    return this.refreshCsrf(res);
  }
  post(path: string, body?: unknown) {
    return this.send('post', path, body);
  }
  patch(path: string, body?: unknown) {
    return this.send('patch', path, body);
  }
  put(path: string, body?: unknown) {
    return this.send('put', path, body);
  }
  del(path: string) {
    return this.send('delete', path);
  }
  async login(email: string, password: string) {
    const res = await this.post('/auth/login', { email, password });
    if (res.status !== 200) throw new Error(`login failed ${res.status} ${JSON.stringify(res.body)}`);
    return this;
  }
}

export const client = (app: App) => new Client(app).init();

export async function createAdmin(app: App) {
  const s = app.container.services;
  const db = app.container.db;
  const email = `${uid('admin')}@test.local`;
  const password = 'Admin@12345';
  const role = await db.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  await db.user.create({
    data: { email, name: 'Test Admin', passwordHash: await s.auth.hashPassword(password), roles: { create: [{ roleId: role.id }] } },
  });
  return (await client(app)).login(email, password);
}

export async function createCustomer(app: App) {
  const email = `${uid('cust')}@test.local`;
  const c = await client(app);
  const res = await c.post('/auth/register', { name: 'Test Customer', email, password: 'Customer@123', phone: phone() });
  if (res.status !== 201) throw new Error(`register failed ${JSON.stringify(res.body)}`);
  const addr = await c.post('/me/addresses', {
    fullName: 'Test Customer', phone: '9876543210', line1: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', isDefault: true,
  });
  return Object.assign(c, { userId: res.body.result.id as string, addressId: addr.body.result.id as string, email });
}

export async function createSeller(app: App, opts: { approve?: boolean } = { approve: true }) {
  const email = `${uid('sell')}@test.local`;
  const c = await client(app);
  const res = await c.post('/sellers/register', {
    name: 'Test Seller', email, phone: phone(), password: 'Seller@12345', businessName: `Store ${uid()}`, businessType: 'PROPRIETORSHIP',
    addressLine1: '1 Market Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', pan: 'ABCDE1234F', acceptTerms: true, acceptCommissionPolicy: true,
  });
  if (res.status !== 201) throw new Error(`seller register failed ${JSON.stringify(res.body)}`);
  const sellerId = res.body.result.seller.id as string;
  if (opts.approve !== false) {
    await app.container.services.sellers.changeStatus(sellerId, 'APPROVED', undefined, null);
  }
  return Object.assign(c, { sellerId, userId: res.body.result.id as string, email });
}

let categoryId: string | null = null;
export async function testCategory(app: App) {
  if (categoryId) return categoryId;
  const cat = await app.container.services.catalog.createCategory(
    { name: `Test ${uid()}`, sortOrder: 0, isActive: true, commissionPercent: 10, taxRate: 18 },
    null,
  );
  categoryId = cat.id;
  return cat.id;
}

export function productInput(categoryId: string, over: Partial<ProductUpsertInput> = {}, variants?: Array<Partial<ProductUpsertInput['variants'][number]>>): ProductUpsertInput {
  return {
    title: `Test Product ${uid()}`,
    description: 'A perfectly ordinary product used in automated tests.',
    highlights: [],
    categoryId,
    brandId: null,
    specifications: [],
    attributes: [],
    tags: [],
    isReturnable: true,
    returnWindowDays: 7,
    codAvailable: true,
    submit: false,
    variants: (variants ?? [{}]).map((v, i) => ({
      options: {},
      sku: `SKU-${uid()}-${i}`,
      price: 1000,
      mrp: 1500,
      stock: 10,
      lowStockThreshold: 2,
      isActive: true,
      ...v,
    })) as ProductUpsertInput['variants'],
    ...over,
  };
}

/** Create an APPROVED product for a seller via the services (fast path). Returns ids. */
export async function liveProduct(app: App, sellerId: string, opts: { price?: number; mrp?: number; stock?: number } = {}) {
  const s = app.container.services;
  const cat = await testCategory(app);
  const p = await s.products.create(sellerId, productInput(cat, {}, [{ price: opts.price ?? 1000, mrp: opts.mrp ?? 1500, stock: opts.stock ?? 10 }]), null);
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#5B3DF5' } }).png().toBuffer();
  const img = await storeOptimizedImage(app.container.storage, 'test', png, 'image/png');
  await app.container.db.productImage.create({ data: { productId: p.id, url: img.url, storageKey: img.key } });
  await s.products.submit(p.id, { kind: 'seller', sellerId }, null);
  await s.products.approve(p.id, null);
  const listing = await app.container.db.sellerProductListing.findFirstOrThrow({ where: { productId: p.id } });
  return { productId: p.id, listingId: listing.id, slug: p.slug };
}

export async function placeOrder(c: Client & { addressId: string }, listingId: string, qty = 1, extra: Record<string, unknown> = {}) {
  const add = await c.post('/cart/items', { listingId, quantity: qty });
  if (add.status !== 200) throw new Error(`add to cart failed ${JSON.stringify(add.body)}`);
  return c.post('/orders', { addressId: c.addressId, paymentMethod: 'COD', shippingMethod: 'STANDARD', idempotencyKey: uid('idem'), ...extra });
}
