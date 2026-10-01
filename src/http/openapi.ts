import { z } from 'zod';
import type { AnyRoute } from './types';
import { API_PREFIX } from '../adapters/types';

function toJsonSchema(schema: z.ZodType | undefined) {
  if (!schema) return undefined;
  try {
    return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  } catch {
    return { type: 'object' };
  }
}

/** Build an OpenAPI 3.1 document from the route definitions (single source of truth). */
export function buildOpenApi(routes: AnyRoute[], meta: { title: string; version: string; serverUrl: string }) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    if (r.rootLevel && !r.docs) continue;
    const full = (r.rootLevel ? r.path : `${API_PREFIX}${r.path}`).replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\*([A-Za-z0-9_]+)$/, '{$1}');
    const params: unknown[] = [];
    for (const m of full.matchAll(/\{([A-Za-z0-9_]+)\}/g)) params.push({ name: m[1], in: 'path', required: true, schema: { type: 'string' } });
    const q = toJsonSchema(r.schema?.query) as { properties?: Record<string, unknown>; required?: string[] } | undefined;
    for (const [name, schema] of Object.entries(q?.properties ?? {})) {
      params.push({ name, in: 'query', required: q?.required?.includes(name) ?? false, schema });
    }
    const body = r.upload
      ? {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' }, data: { type: 'string', description: 'Optional JSON fields' } },
              },
            },
          },
        }
      : r.schema?.body
        ? { required: true, content: { 'application/json': { schema: toJsonSchema(r.schema.body) } } }
        : undefined;
    paths[full] ??= {};
    paths[full][r.method.toLowerCase()] = {
      tags: r.docs?.tags ?? ['Other'],
      summary: r.docs?.summary,
      description: [
        r.docs?.description,
        r.auth === 'required' ? 'Requires authentication.' : r.auth === 'optional' ? 'Authentication optional.' : undefined,
        r.permissions?.length ? `Permissions: ${r.permissions.join(', ')}.` : undefined,
        r.seller ? 'Requires a seller account; data is scoped to the authenticated seller.' : undefined,
      ]
        .filter(Boolean)
        .join(' '),
      parameters: params,
      requestBody: body,
      security: r.auth === 'required' ? [{ cookieAuth: [] }, { bearerAuth: [] }] : [],
      responses: {
        '200': { description: 'Success — `{ success: true, result, message? }`' },
        '400': { description: 'VALIDATION_ERROR' },
        '401': { description: 'UNAUTHENTICATED' },
        '403': { description: 'FORBIDDEN / CSRF_FAILED' },
        '404': { description: 'NOT_FOUND' },
        '409': { description: 'CONFLICT / OUT_OF_STOCK / PRICE_CHANGED' },
        '422': { description: 'BUSINESS_RULE' },
        '429': { description: 'RATE_LIMITED' },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: meta.title,
      version: meta.version,
      description:
        'Vyora marketplace REST API. Browser clients authenticate with HTTP-only cookies and must send the `x-csrf-token` header (value of the `vy_csrf` cookie) on mutating requests. API clients may use `Authorization: Bearer <access token>` instead.',
    },
    servers: [{ url: meta.serverUrl }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'vy_at' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
}
