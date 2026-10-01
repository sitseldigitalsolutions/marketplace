import { z } from 'zod';
import type { Container } from '../../bootstrap/container';
import { buildOpenApi } from '../../http/openapi';
import { reply, route } from '../../http/route';
import type { AnyRoute } from '../../http/types';
import { LocalStorageProvider } from '../../infrastructure/storage';
import { AppError, notFound } from '../../shared/errors';

const startedAt = new Date();

export function systemRoutes(c: Container, getAllRoutes: () => AnyRoute[]) {
  let openapiCache: unknown = null;
  const env = c.env;
  const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!);

  const routes = [
    route({
      method: 'GET',
      path: '/health',
      rootLevel: true,
      auth: 'public',
      docs: { tags: ['System'], summary: 'Liveness probe' },
      handler: async () => ({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000) }),
    }),
    route({
      method: 'GET',
      path: '/health/ready',
      rootLevel: true,
      auth: 'public',
      docs: { tags: ['System'], summary: 'Readiness probe (database, redis)' },
      handler: async () => {
        const db = await c.database.healthCheck();
        let redis: { ok: boolean } | null = null;
        if (c.redis) {
          try {
            await c.redis.ping();
            redis = { ok: true };
          } catch {
            redis = { ok: false };
          }
        }
        const ok = db.ok && (redis?.ok ?? true);
        const body = {
          success: ok,
          result: {
            status: ok ? 'ready' : 'degraded',
            framework: env.BACKEND_FRAMEWORK,
            database: { type: env.DATABASE_TYPE, orm: env.ORM_PROVIDER, ok: db.ok, latencyMs: db.latencyMs },
            redis,
            storage: c.storage.name,
          },
        };
        return { __reply: true, status: ok ? 200 : 503, body: { kind: 'json', data: body } } as const;
      },
    }),
    route({
      method: 'GET',
      path: '/openapi.json',
      auth: 'public',
      docs: { tags: ['System'], summary: 'OpenAPI document' },
      handler: async () => {
        openapiCache ??= buildOpenApi(getAllRoutes(), { title: 'Vyora Marketplace API', version: '1.0.0', serverUrl: env.API_BASE_URL });
        return reply.buffer(Buffer.from(JSON.stringify(openapiCache)), 'application/json; charset=utf-8');
      },
    }),
    route({
      method: 'GET',
      path: '/api/docs',
      rootLevel: true,
      auth: 'public',
      handler: async () => {
        if (env.APP_ENV === 'production') throw notFound('Route');
        return reply.html(`<!doctype html><html><head><meta charset="utf-8"><title>Vyora API docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#ui', withCredentials: true });</script></body></html>`);
      },
    }),
    // Public uploaded media (product images, banners). Cacheable forever — keys are content-unique.
    route({
      method: 'GET',
      path: '/uploads/*key',
      rootLevel: true,
      auth: 'public',
      schema: { params: z.object({ key: z.string().max(400) }) },
      handler: async (ctx) => {
        if (c.storage.name !== 'local') throw notFound('File');
        let obj;
        try {
          obj = await c.storage.get(ctx.params.key, 'public');
        } catch {
          throw notFound('File');
        }
        if (!obj) throw notFound('File');
        const r = reply.stream(obj.stream, obj.contentType, { cache: 'public, max-age=31536000, immutable' });
        r.headers = { ...r.headers, 'cross-origin-resource-policy': 'cross-origin' };
        return r;
      },
    }),
    // Private files (seller KYC) — only reachable with a valid, unexpired signature.
    route({
      method: 'GET',
      path: '/files/private/*key',
      rootLevel: true,
      auth: 'public',
      schema: { params: z.object({ key: z.string().max(400) }), query: z.object({ exp: z.coerce.number(), sig: z.string().max(100) }) },
      handler: async (ctx) => {
        if (!(c.storage instanceof LocalStorageProvider)) throw notFound('File');
        if (!c.storage.verifySignature(ctx.params.key, ctx.query.exp, ctx.query.sig)) {
          throw new AppError(403, 'FORBIDDEN', 'This link has expired');
        }
        const obj = await c.storage.get(ctx.params.key, 'private');
        if (!obj) throw notFound('File');
        return reply.stream(obj.stream, obj.contentType, { cache: 'private, no-store' });
      },
    }),
    route({
      method: 'GET',
      path: '/sitemap.xml',
      rootLevel: true,
      auth: 'public',
      handler: async () => {
        const base = env.FRONTEND_URL.replace(/\/$/, '');
        const { products, categories, sellers } = await c.services.storefront.sitemapEntries();
        const url = (loc: string, lastmod?: Date) =>
          `<url><loc>${xmlEscape(base + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
          url('/'),
          ...categories.map((x) => url(`/c/${x.slug}`, x.updatedAt)),
          ...products.map((x) => url(`/p/${x.slug}`, x.updatedAt)),
          ...sellers.map((x) => url(`/store/${x.slug}`, x.updatedAt)),
        ].join('')}</urlset>`;
        const r = reply.buffer(Buffer.from(xml), 'application/xml; charset=utf-8', { cache: 'public, max-age=3600' });
        return r;
      },
    }),
    route({
      method: 'GET',
      path: '/robots.txt',
      rootLevel: true,
      auth: 'public',
      handler: async () => {
        const base = env.FRONTEND_URL.replace(/\/$/, '');
        const body =
          env.APP_ENV === 'production'
            ? `User-agent: *\nDisallow: /admin\nDisallow: /seller\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nSitemap: ${base}/sitemap.xml\n`
            : 'User-agent: *\nDisallow: /\n';
        return reply.buffer(Buffer.from(body), 'text/plain; charset=utf-8', { cache: 'public, max-age=3600' });
      },
    }),
  ];

  // Development mailbox: read emails "sent" by the console mailer. Never mounted in production.
  if (env.APP_ENV === 'development' || env.APP_ENV === 'test') {
    routes.push(
      route({
        method: 'GET',
        path: '/dev/mailbox',
        auth: 'public',
        schema: { query: z.object({ to: z.string().max(191).optional() }) },
        docs: { tags: ['System'], summary: 'Development-only: emails captured by the console mailer' },
        handler: async (ctx) => c.services.notifications.outbox(1, 50, ctx.query.to),
      }),
    );
  }
  return routes;
}
