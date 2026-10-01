import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { App } from '../src/app';
import { bootApp, client, createCustomer, uid } from './helpers';

let app: App;
beforeAll(async () => {
  app = await bootApp();
});
afterAll(async () => {
  await app.close();
});

describe('authentication', () => {
  it('registers, returns the session user and never exposes the password hash', async () => {
    const c = await client(app);
    const email = `${uid()}@test.local`;
    const res = await c.post('/auth/register', { name: 'Asha', email, password: 'Strong@123' });
    expect(res.status).toBe(201);
    expect(res.body.result.roles).toEqual(['CUSTOMER']);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$argon2|\$2[ab]\$/);
    const user = await app.container.db.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    const me = await c.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.result.email).toBe(email);
  });

  it('sets HTTP-only, SameSite session cookies', async () => {
    const c = await client(app);
    const res = await c.post('/auth/register', { name: 'Cookie', email: `${uid()}@test.local`, password: 'Strong@123' });
    const cookies = ([] as string[]).concat(res.headers['set-cookie']);
    const at = cookies.find((x) => x.startsWith('vy_at='))!;
    const rt = cookies.find((x) => x.startsWith('vy_rt='))!;
    expect(at).toMatch(/HttpOnly/);
    expect(at).toMatch(/SameSite=Lax/);
    expect(rt).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('rejects weak passwords and invalid input with VALIDATION_ERROR', async () => {
    const c = await client(app);
    const res = await c.post('/auth/register', { name: 'A', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('requires a CSRF token for cookie-authenticated mutations', async () => {
    const res = await request(app.adapter.httpServer()).post('/api/v1/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('locks the account after repeated failures', async () => {
    const cust = await createCustomer(app);
    const c = await client(app);
    for (let i = 0; i < 5; i++) {
      const r = await c.post('/auth/login', { email: cust.email, password: 'Wrong@1234' });
      expect(r.status).toBe(401);
    }
    const locked = await c.post('/auth/login', { email: cust.email, password: 'Customer@123' });
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
    // Security events are recorded asynchronously (best effort) — wait for the row.
    await expect.poll(() => app.container.db.securityEvent.count({ where: { userId: cust.userId, type: 'ACCOUNT_LOCKED' } })).toBe(1);
  });

  it('rotates refresh tokens and revokes the family when an old token is replayed', async () => {
    const cust = await createCustomer(app);
    const jarCookies = await cust.agent.get('/api/v1/auth/me');
    expect(jarCookies.status).toBe(200);
    // Capture the current refresh token by logging in with a raw agent.
    const raw = request.agent(app.adapter.httpServer());
    const csrf = (await raw.get('/api/v1/auth/csrf')).body.result.csrfToken;
    const login = await raw.post('/api/v1/auth/login').set('x-csrf-token', csrf).send({ email: cust.email, password: 'Customer@123' });
    const rt = ([] as string[]).concat(login.headers['set-cookie']).find((x) => x.startsWith('vy_rt='))!.split(';')[0];
    const csrf2 = decodeURIComponent(([] as string[]).concat(login.headers['set-cookie']).find((x) => x.startsWith('vy_csrf='))!.split(';')[0].slice(8));

    const first = await request(app.adapter.httpServer()).post('/api/v1/auth/refresh').set('cookie', `${rt}; vy_csrf=${csrf2}`).set('x-csrf-token', csrf2);
    expect(first.status).toBe(200);
    // Replaying the rotated token is detected and kills the whole session family.
    const replay = await request(app.adapter.httpServer()).post('/api/v1/auth/refresh').set('cookie', `${rt}; vy_csrf=${csrf2}`).set('x-csrf-token', csrf2);
    expect(replay.status).toBe(401);
    const newRt = ([] as string[]).concat(first.headers['set-cookie']).find((x) => x.startsWith('vy_rt='))!.split(';')[0];
    const afterReuse = await request(app.adapter.httpServer()).post('/api/v1/auth/refresh').set('cookie', `${newRt}; vy_csrf=${csrf2}`).set('x-csrf-token', csrf2);
    expect(afterReuse.status).toBe(401);
    await expect.poll(() => app.container.db.securityEvent.count({ where: { userId: cust.userId, type: 'REFRESH_TOKEN_REUSE' } })).toBe(1);
  });

  it('logout revokes the session immediately', async () => {
    const cust = await createCustomer(app);
    expect((await cust.get('/auth/me')).status).toBe(200);
    const token = ([] as string[]).concat((await cust.post('/auth/login', { email: cust.email, password: 'Customer@123' })).headers['set-cookie'])
      .find((x) => x.startsWith('vy_at='))!.split(';')[0].slice(6);
    await cust.post('/auth/logout');
    // Even a still-unexpired access token no longer works once its session is revoked.
    const res = await request(app.adapter.httpServer()).get('/api/v1/auth/me').set('authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('password reset works once and does not reveal whether an email exists', async () => {
    const cust = await createCustomer(app);
    const anon = await client(app);
    const unknown = await anon.post('/auth/forgot-password', { email: `${uid()}@nowhere.test` });
    const known = await anon.post('/auth/forgot-password', { email: cust.email });
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    await app.container.jobs.drain();
    const token = await app.container.services.auth.createOneTimeToken(cust.userId, 'PASSWORD_RESET', 60);
    const reset = await anon.post('/auth/reset-password', { token, password: 'Newpass@123' });
    expect(reset.status).toBe(200);
    const again = await anon.post('/auth/reset-password', { token, password: 'Other@1234' });
    expect(again.status).toBe(400);
    await (await client(app)).login(cust.email, 'Newpass@123');
  });

  it('suspended users lose access immediately', async () => {
    const cust = await createCustomer(app);
    await app.container.db.user.update({ where: { id: cust.userId }, data: { status: 'SUSPENDED' } });
    app.container.services.auth.invalidatePrincipal(cust.userId);
    expect((await cust.get('/auth/me')).status).toBe(401);
  });
});
