import { describe, expect, it } from 'vitest';
import { ConfigError, loadEnv } from '../src/config/env';
import { toHapiPath } from '../src/adapters/hapi';
import { sniffMime } from '../src/http/multipart';
import { booleanQuery } from '../src/modules/catalog/storefront.service';

const base = {
  DATABASE_URL: 'mysql://u:p@localhost:3306/db',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
};

describe('startup configuration', () => {
  it('accepts the default mysql + prisma + express configuration', () => {
    const env = loadEnv({ ...base });
    expect([env.DATABASE_TYPE, env.ORM_PROVIDER, env.BACKEND_FRAMEWORK]).toEqual(['mysql', 'prisma', 'express']);
  });
  it('rejects unsupported or unimplemented database/ORM combinations', () => {
    expect(() => loadEnv({ ...base, DATABASE_TYPE: 'mysql', ORM_PROVIDER: 'mongoose' })).toThrow(ConfigError);
    expect(() => loadEnv({ ...base, DATABASE_TYPE: 'mongodb', ORM_PROVIDER: 'mongoose', MONGODB_URL: 'mongodb://x' })).toThrow(/not available/);
  });
  it('rejects unknown frameworks and short secrets', () => {
    expect(() => loadEnv({ ...base, BACKEND_FRAMEWORK: 'koa' })).toThrow(ConfigError);
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/32 characters/);
  });
  it('enforces production hardening', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(/COOKIE_SECURE/);
    expect(() =>
      loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true', FILE_SIGNING_SECRET: 'x'.repeat(32), JWT_ACCESS_SECRET: 'replace_me'.padEnd(40, 'x') }),
    ).toThrow(/placeholder/);
    expect(loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true', FILE_SIGNING_SECRET: 'x'.repeat(32) }).APP_ENV).toBe('production');
  });
});

describe('framework-neutral helpers', () => {
  it('translates route paths for hapi', () => {
    expect(toHapiPath('/api/v1/products/:id/images/:imageId')).toBe('/api/v1/products/{id}/images/{imageId}');
    expect(toHapiPath('/uploads/*key')).toBe('/uploads/{key*}');
  });
  it('detects file types from magic bytes, not names', () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/png', 'a.png')).toBe('image/jpeg');
    expect(sniffMime(Buffer.from('<svg onload=alert(1)>'), 'image/png', 'a.png')).toBeNull();
    expect(sniffMime(Buffer.from('%PDF-1.7'), 'application/pdf', 'a.pdf')).toBe('application/pdf');
  });
  it('builds safe boolean full-text queries', () => {
    expect(booleanQuery('Wireless +earbuds* "pro"')).toBe('+wireless* +earbuds* +pro*');
    expect(booleanQuery('tv')).toBeNull();
  });
});

describe('analytics day buckets', () => {
  it('computes timezone offsets (IST has no DST)', async () => {
    const { tzOffsetMinutes } = await import('../src/modules/analytics/analytics.service');
    expect(tzOffsetMinutes('Asia/Kolkata', new Date('2026-01-15T12:00:00Z'))).toBe(330);
    expect(tzOffsetMinutes('UTC')).toBe(0);
  });
});
