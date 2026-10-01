import type { Readable } from 'node:stream';
import type { z } from 'zod';
import type { AnyRoute, Reply, RouteDefinition } from './types';

/** Define a route with fully inferred handler types. */
export function route<
  SB extends z.ZodType | undefined = undefined,
  SQ extends z.ZodType | undefined = undefined,
  SP extends z.ZodType | undefined = undefined,
>(def: RouteDefinition<SB, SQ, SP>): AnyRoute {
  return def as AnyRoute;
}

export const reply = {
  ok(result: unknown, message?: string): Reply {
    return { __reply: true, status: 200, body: { kind: 'json', data: { success: true, result, message } } };
  },
  created(result: unknown, message?: string): Reply {
    return { __reply: true, status: 201, body: { kind: 'json', data: { success: true, result, message } } };
  },
  noContent(): Reply {
    return { __reply: true, status: 204, body: { kind: 'empty' } };
  },
  buffer(data: Buffer, contentType: string, opts: { filename?: string; cache?: string } = {}): Reply {
    const headers: Record<string, string> = {};
    if (opts.filename) headers['content-disposition'] = `attachment; filename="${opts.filename.replace(/"/g, '')}"`;
    if (opts.cache) headers['cache-control'] = opts.cache;
    return { __reply: true, status: 200, body: { kind: 'buffer', data, contentType }, headers };
  },
  stream(data: Readable, contentType: string, opts: { cache?: string; inline?: boolean } = {}): Reply {
    const headers: Record<string, string> = {};
    if (opts.cache) headers['cache-control'] = opts.cache;
    return { __reply: true, status: 200, body: { kind: 'stream', data, contentType }, headers };
  },
  html(markup: string): Reply {
    return {
      __reply: true,
      status: 200,
      body: { kind: 'buffer', data: Buffer.from(markup), contentType: 'text/html; charset=utf-8' },
    };
  },
  redirect(location: string, status = 302): Reply {
    return { __reply: true, status, body: { kind: 'empty' }, headers: { location } };
  },
};

export const isReply = (v: unknown): v is Reply => typeof v === 'object' && v !== null && '__reply' in v;
