import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { bootApp, client, createSeller, liveProduct } from './helpers';

/** The same business flows run unchanged on the Hapi adapter. */
let app: App;
beforeAll(async () => {
  app = await bootApp('hapi');
});
afterAll(async () => {
  await app.close();
});

describe('hapi adapter', () => {
  it('serves health, validation errors and 404s in the standard envelope', async () => {
    const c = await client(app);
    expect((await c.agent.get('/health')).body.result.status).toBe('ok');
    const bad = await c.post('/auth/register', { email: 'x' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const missing = await c.get('/definitely-not-a-route');
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
  });

  it('runs the cookie session, CSRF and seller isolation flows', async () => {
    const a = await createSeller(app);
    const b = await createSeller(app);
    const pb = await liveProduct(app, b.sellerId);
    expect((await a.get('/auth/me')).body.result.seller.id).toBe(a.sellerId);
    expect((await a.get(`/seller/products/${pb.productId}`)).status).toBe(404);
    expect((await b.get(`/seller/products/${pb.productId}`)).status).toBe(200);
    const products = await a.get(`/products?pageSize=5`);
    expect(products.status).toBe(200);
  });
});
