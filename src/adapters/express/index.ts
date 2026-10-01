import { createServer, type Server } from 'node:http';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Env } from '../../config/env';
import type { Pipeline } from '../../http/pipeline';
import type { AnyRoute, NormalizedResponse } from '../../http/types';
import { allowedOrigins, flatHeaders, fullPath, type HttpAdapter } from '../types';

function send(res: Response, out: NormalizedResponse) {
  res.status(out.status);
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  if (out.cookies.length) res.setHeader('set-cookie', out.cookies);
  switch (out.body.kind) {
    case 'json':
      res.send(JSON.stringify(out.body.data));
      return;
    case 'buffer':
      res.end(out.body.data);
      return;
    case 'stream':
      out.body.data.on('error', () => res.destroy());
      out.body.data.pipe(res);
      return;
    default:
      res.end();
  }
}

const errorJson = (code: string, message: string) => JSON.stringify({ success: false, error: { code, details: [] }, message });

export function createExpressAdapter(env: Env): HttpAdapter {
  const app = express();
  const server: Server = createServer(app);

  app.disable('x-powered-by');
  app.set('trust proxy', env.APP_ENV === 'production' || env.APP_ENV === 'staging' ? 1 : 'loopback');
  app.use(
    cors({
      origin: allowedOrigins(env),
      credentials: true,
      allowedHeaders: ['content-type', 'x-csrf-token', 'x-request-id', 'authorization', 'idempotency-key', 'x-skip-refresh'],
      exposedHeaders: ['x-request-id', 'content-disposition'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  return {
    name: 'express',
    async init(routes: AnyRoute[], pipeline: Pipeline) {
      for (const r of routes) {
        const method = r.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
        app[method](fullPath(r), async (req: Request, res: Response) => {
          const params: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.params ?? {})) {
            params[k] = Array.isArray(v) ? v.join('/') : String(v);
          }
          const out = await pipeline(r, {
            method: r.method,
            path: req.path,
            params,
            query: req.query as Record<string, unknown>,
            headers: flatHeaders(req.headers),
            body: req.body,
            ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
            rawStream: r.upload ? req : undefined,
          });
          send(res, out);
        });
      }

      app.use((_req: Request, res: Response) => {
        res.status(404).type('application/json').send(errorJson('NOT_FOUND', 'Route not found'));
      });
      // Body-parser failures (malformed JSON, payload too large) never reach the pipeline.
      app.use((err: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
        const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : status < 500 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
        const message =
          status === 413 ? 'Request body is too large' : status < 500 ? 'Malformed request body' : 'Something went wrong';
        res.status(status).type('application/json').send(errorJson(code, message));
      });
    },
    listen(port: number) {
      return new Promise((resolve) => server.listen(port, () => resolve()));
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
    httpServer: () => server,
  };
}
