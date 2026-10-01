import { z } from 'zod';
import { idSchema } from '@vyora/shared';
import type { RequestContext } from './types';

export const idParams = z.object({ id: idSchema });
export const exportQuery = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export const rangeQuery = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });

/** Audit actor from the request context. */
export const actorOf = (ctx: RequestContext) => ({ auth: ctx.auth, ip: ctx.ip, userAgent: ctx.userAgent });

/** The authenticated seller id — always derived from the session, never from client input. */
export function sellerIdOf(ctx: RequestContext): string {
  if (!ctx.auth?.sellerId) throw new Error('seller route without seller principal');
  return ctx.auth.sellerId;
}

export const userIdOf = (ctx: RequestContext): string => {
  if (!ctx.auth) throw new Error('authenticated route without principal');
  return ctx.auth.userId;
};

export const MB = 1024 * 1024;
