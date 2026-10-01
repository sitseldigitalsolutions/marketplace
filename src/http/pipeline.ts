import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ZodError, type z } from 'zod';
import type { Env } from '../config/env';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { randomToken, safeEqual } from '../shared/crypto';
import { parseCookies, serializeCookie } from './cookies';
import { parseMultipart } from './multipart';
import type { RateLimitStore } from './rate-limit';
import { isReply } from './route';
import type {
  AnyRoute,
  AuthContext,
  CookieOptions,
  NormalizedRequest,
  NormalizedResponse,
  RequestContext,
} from './types';

export const ACCESS_COOKIE = 'vy_at';
export const REFRESH_COOKIE = 'vy_rt';
export const CSRF_COOKIE = 'vy_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export interface PipelineDeps {
  env: Env;
  /** Verify an access token and load the principal (roles, permissions, seller) from the database. */
  resolveAuth(token: string): Promise<AuthContext | null>;
  rateLimitStore: RateLimitStore;
  onSecurityEvent?(type: string, ctx: { ip: string; userId?: string; details?: unknown }): void;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

function securityHeaders(env: Env, contentType: string | undefined): Record<string, string> {
  const h: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'x-dns-prefetch-control': 'off',
  };
  if (!contentType?.startsWith('text/html')) {
    h['content-security-policy'] = "default-src 'none'; frame-ancestors 'none'";
  }
  if (env.APP_ENV === 'production' || env.APP_ENV === 'staging') {
    h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  }
  return h;
}

function parseBody(schema: z.ZodType | undefined, value: unknown) {
  if (!schema) return value;
  const r = schema.safeParse(value ?? {});
  if (!r.success) throw new AppError(400, 'VALIDATION_ERROR', 'Please check your input', zodDetails(r.error));
  return r.data;
}

export function createPipeline(deps: PipelineDeps) {
  const { env } = deps;
  const cookieBase: CookieOptions = {
    secure: env.COOKIE_SECURE,
    sameSite: 'Lax',
    domain: env.COOKIE_DOMAIN || undefined,
  };

  return async function execute(route: AnyRoute, req: NormalizedRequest): Promise<NormalizedResponse> {
    const requestId = (req.headers['x-request-id'] ?? '').slice(0, 64) || randomUUID();
    const cookies = parseCookies(req.headers.cookie);
    const setCookies: string[] = [];
    const started = Date.now();
    let status = 200;
    let userId: string | undefined;

    const respond = (res: Omit<NormalizedResponse, 'cookies'>): NormalizedResponse => {
      const contentType =
        res.body.kind === 'json'
          ? 'application/json; charset=utf-8'
          : res.body.kind === 'empty'
            ? undefined
            : res.body.contentType;
      status = res.status;
      return {
        ...res,
        headers: {
          ...securityHeaders(env, contentType),
          'x-request-id': requestId,
          ...(res.body.kind === 'json' ? { 'cache-control': 'no-store' } : {}),
          ...res.headers,
          ...(contentType ? { 'content-type': contentType } : {}),
        },
        cookies: setCookies,
      };
    };

    const errorResponse = (err: unknown): NormalizedResponse => {
      if (err instanceof AppError) {
        return respond({
          status: err.status,
          headers: {},
          body: {
            kind: 'json',
            data: { success: false, error: { code: err.code, details: err.details ?? [] }, message: err.message },
          },
        });
      }
      if (err instanceof ZodError) {
        return respond({
          status: 400,
          headers: {},
          body: {
            kind: 'json',
            data: {
              success: false,
              error: { code: 'VALIDATION_ERROR', details: zodDetails(err) },
              message: 'Please check your input',
            },
          },
        });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          return respond({
            status: 409,
            headers: {},
            body: {
              kind: 'json',
              data: { success: false, error: { code: 'CONFLICT', details: [] }, message: 'A record with these details already exists' },
            },
          });
        }
        if (err.code === 'P2034') {
          return respond({
            status: 409,
            headers: { 'retry-after': '1' },
            body: { kind: 'json', data: { success: false, error: { code: 'CONFLICT', details: [] }, message: 'We were busy processing another request. Please try again.' } },
          });
        }
        if (err.code === 'P2025') {
          return respond({
            status: 404,
            headers: {},
            body: { kind: 'json', data: { success: false, error: { code: 'NOT_FOUND', details: [] }, message: 'Resource not found' } },
          });
        }
      }
      logger.error({ err, requestId, path: req.path, method: req.method }, 'unhandled error');
      return respond({
        status: 500,
        headers: {},
        body: {
          kind: 'json',
          data: {
            success: false,
            error: { code: 'INTERNAL_ERROR', details: [] },
            message: 'Something went wrong on our side. Please try again.',
          },
        },
      });
    };

    try {
      // 1. Global rate limit per IP.
      if (!route.rootLevel) {
        const hit = await deps.rateLimitStore.hit(`global:${req.ip}`, env.RATE_LIMIT_WINDOW_SECONDS);
        if (hit.count > env.RATE_LIMIT_MAX) {
          deps.onSecurityEvent?.('RATE_LIMITED', { ip: req.ip, details: { bucket: 'global', path: req.path } });
          throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.');
        }
      }

      // 2. Authentication — bearer header (API clients) or HTTP-only cookie (browser).
      const authHeader = req.headers.authorization;
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const token = bearer ?? cookies[ACCESS_COOKIE] ?? null;
      let auth: AuthContext | null = null;
      if (token && route.auth !== 'public') {
        auth = await deps.resolveAuth(token);
      }
      userId = auth?.userId;
      if (route.auth === 'required' && !auth) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
      }

      // 3. CSRF (double-submit cookie) for cookie-authenticated browser mutations.
      if (MUTATING.has(req.method) && route.csrf !== false && !bearer) {
        const header = req.headers[CSRF_HEADER] ?? '';
        const cookie = cookies[CSRF_COOKIE] ?? '';
        if (!header || !cookie || !safeEqual(header, cookie)) {
          deps.onSecurityEvent?.('CSRF_FAILED', { ip: req.ip, userId, details: { path: req.path } });
          throw new AppError(403, 'CSRF_FAILED', 'Your session token has expired. Please refresh the page and try again.');
        }
      }
      if (!cookies[CSRF_COOKIE] && !route.rootLevel) {
        setCookies.push(serializeCookie(CSRF_COOKIE, randomToken(24), { ...cookieBase, httpOnly: false }));
      }

      // 4. Authorization.
      if (route.permissions?.length) {
        if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
        const missing = route.permissions.filter((p) => !auth!.permissions.has(p));
        if (missing.length) {
          deps.onSecurityEvent?.('ACCESS_DENIED', { ip: req.ip, userId, details: { path: req.path, missing } });
          throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
        }
      }
      if (route.seller) {
        if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
        if (!auth.sellerId) throw new AppError(403, 'FORBIDDEN', 'A seller account is required');
      }

      // 5. Route-specific rate limit.
      if (route.rateLimit) {
        const rl = route.rateLimit;
        const key = `${rl.name}:${rl.by === 'user' && auth ? auth.userId : req.ip}`;
        const hit = await deps.rateLimitStore.hit(key, rl.windowSeconds);
        if (hit.count > rl.max * env.RATE_LIMIT_ROUTE_MULTIPLIER) {
          deps.onSecurityEvent?.('RATE_LIMITED', { ip: req.ip, userId, details: { bucket: rl.name } });
          throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a moment and try again.');
        }
      }

      // 6. Body: multipart uploads or JSON.
      let rawBody = req.body;
      let files: RequestContext['files'] = [];
      if (route.upload) {
        if (!req.rawStream) throw new AppError(400, 'VALIDATION_ERROR', 'Upload stream missing');
        const parsed = await parseMultipart(req.rawStream, req.headers, route.upload);
        files = parsed.files;
        let data: Record<string, unknown> = { ...parsed.fields };
        if (typeof parsed.fields.data === 'string') {
          try {
            data = { ...data, ...JSON.parse(parsed.fields.data) };
          } catch {
            throw new AppError(400, 'VALIDATION_ERROR', 'Field "data" must be valid JSON');
          }
          delete data.data;
        }
        rawBody = data;
      }

      // 7. Validation.
      const params = parseBody(route.schema?.params, req.params);
      const query = parseBody(route.schema?.query, req.query);
      const body = route.schema?.body ? parseBody(route.schema.body, rawBody) : rawBody;

      const ctx: RequestContext = {
        body,
        query,
        params,
        headers: req.headers,
        cookies,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
        requestId,
        auth,
        files,
        setCookie(name, value, options = {}) {
          setCookies.push(serializeCookie(name, value, { ...cookieBase, httpOnly: true, ...options }));
        },
        clearCookie(name, options = {}) {
          setCookies.push(serializeCookie(name, '', { ...cookieBase, httpOnly: true, ...options, maxAgeSeconds: 0 }));
        },
      };

      const result = await route.handler(ctx as never);
      if (isReply(result)) {
        return respond({ status: result.status, headers: result.headers ?? {}, body: result.body });
      }
      return respond({ status: 200, headers: {}, body: { kind: 'json', data: { success: true, result } } });
    } catch (err) {
      return errorResponse(err);
    } finally {
      logger.debug(
        { requestId, method: req.method, path: req.path, status, ms: Date.now() - started, userId },
        'request',
      );
    }
  };
}

export type Pipeline = ReturnType<typeof createPipeline>;
