import Hapi, { type Request, type ResponseToolkit } from '@hapi/hapi';
import type { Readable } from 'node:stream';
import type { Env } from '../../config/env';
import type { Pipeline } from '../../http/pipeline';
import type { AnyRoute, NormalizedResponse } from '../../http/types';
import { allowedOrigins, flatHeaders, fullPath, type HttpAdapter } from '../types';

/** "/products/:id" → "/products/{id}", "/uploads/*key" → "/uploads/{key*}" */
export function toHapiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\*([A-Za-z0-9_]+)$/, '{$1*}');
}

function toHapiResponse(h: ResponseToolkit, out: NormalizedResponse) {
  const body = out.body;
  const response =
    body.kind === 'json'
      ? h.response(JSON.stringify(body.data))
      : body.kind === 'buffer'
        ? h.response(body.data)
        : body.kind === 'stream'
          ? h.response(body.data)
          : h.response();
  response.code(out.status);
  for (const [k, v] of Object.entries(out.headers)) response.header(k, v);
  for (const c of out.cookies) response.header('set-cookie', c, { append: true });
  if (body.kind === 'empty') response.header('content-length', '0');
  return response;
}

const errorBody = (code: string, message: string) => ({ success: false, error: { code, details: [] }, message });

export function createHapiAdapter(env: Env): HttpAdapter {
  const server = Hapi.server({
    port: env.PORT,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: allowedOrigins(env),
        credentials: true,
        additionalHeaders: ['x-csrf-token', 'x-request-id', 'idempotency-key', 'x-skip-refresh'],
        additionalExposedHeaders: ['x-request-id', 'content-disposition'],
      },
      // Cookies are parsed by the shared pipeline.
      state: { parse: false, failAction: 'ignore' },
    },
  });

  return {
    name: 'hapi',
    async init(routes: AnyRoute[], pipeline: Pipeline) {
      for (const r of routes) {
        const isMutating = r.method !== 'GET';
        server.route({
          method: r.method,
          path: toHapiPath(fullPath(r)),
          options: {
            ...(isMutating
              ? {
                  payload: r.upload
                    ? { output: 'stream', parse: false, maxBytes: r.upload.maxFileBytes * r.upload.maxFiles + 1_000_000 }
                    : { maxBytes: 1_048_576, parse: true, failAction: 'error' },
                }
              : {}),
          },
          handler: async (request: Request, h: ResponseToolkit) => {
            const params: Record<string, string> = {};
            for (const [k, v] of Object.entries(request.params ?? {})) params[k] = String(v);
            const out = await pipeline(r, {
              method: r.method,
              path: request.path,
              params,
              query: request.query as Record<string, unknown>,
              headers: flatHeaders(request.headers as Record<string, string | string[] | undefined>),
              body: r.upload ? undefined : (request.payload ?? undefined),
              ip: request.info.remoteAddress,
              rawStream: r.upload ? (request.payload as Readable) : undefined,
            });
            return toHapiResponse(h, out);
          },
        });
      }

      // Map framework-level errors (404, malformed payload, 413 …) to the standard envelope.
      server.ext('onPreResponse', (request, h) => {
        const res = request.response;
        if (!('isBoom' in res) || !res.isBoom) return h.continue;
        const status = res.output.statusCode;
        const code =
          status === 404
            ? 'NOT_FOUND'
            : status === 413
              ? 'PAYLOAD_TOO_LARGE'
              : status === 415
                ? 'UNSUPPORTED_MEDIA'
                : status < 500
                  ? 'VALIDATION_ERROR'
                  : 'INTERNAL_ERROR';
        const message =
          status === 404 ? 'Route not found' : status < 500 ? 'Malformed request' : 'Something went wrong';
        return h.response(errorBody(code, message)).code(status >= 500 ? 500 : status);
      });

      await server.initialize();
    },
    async listen() {
      await server.start();
    },
    async close() {
      await server.stop({ timeout: 5000 });
    },
    httpServer: () => server.listener,
  };
}
