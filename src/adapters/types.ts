import type { Server as HttpServer } from 'node:http';
import type { Env } from '../config/env';
import type { Pipeline } from '../http/pipeline';
import type { AnyRoute } from '../http/types';

export const API_PREFIX = '/api/v1';

/**
 * Contract every HTTP framework adapter implements. Adapters only translate between the
 * framework's request/response objects and the framework-neutral pipeline — they contain
 * no business logic, authorization or validation.
 */
export interface HttpAdapter {
  readonly name: 'express' | 'hapi';
  init(routes: AnyRoute[], pipeline: Pipeline): Promise<void>;
  listen(port: number): Promise<void>;
  close(): Promise<void>;
  /** Underlying Node HTTP server (used by tests via supertest). */
  httpServer(): HttpServer;
}

export type AdapterFactory = (env: Env) => HttpAdapter;

export function allowedOrigins(env: Env): string[] {
  return [env.FRONTEND_URL, ...env.CORS_ORIGINS.split(',').map((s) => s.trim())].filter(Boolean);
}

export const fullPath = (r: AnyRoute) => (r.rootLevel ? r.path : `${API_PREFIX}${r.path}`);

/** Normalise a framework's header object into lower-case single values. */
export function flatHeaders(h: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  return out;
}
