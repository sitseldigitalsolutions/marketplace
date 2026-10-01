import type { Readable } from 'node:stream';
import type { z } from 'zod';
import type { Permission, RoleCode } from '@vyora/shared';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** The authenticated principal, always resolved server-side from the verified access token. */
export interface AuthContext {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  roles: RoleCode[];
  permissions: Set<string>;
  /** Present only when the user owns a seller account. Never taken from client input. */
  sellerId: string | null;
  sellerStatus: string | null;
}

export interface UploadedFile {
  field: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  domain?: string;
  maxAgeSeconds?: number;
}

export interface SetCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

/** Framework-neutral request produced by an adapter. */
export interface NormalizedRequest {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  headers: Record<string, string | undefined>;
  body: unknown;
  ip: string;
  /** Raw body stream — only provided for multipart upload routes. */
  rawStream?: Readable;
}

export type ResponseBody =
  | { kind: 'json'; data: unknown }
  | { kind: 'buffer'; data: Buffer; contentType: string }
  | { kind: 'stream'; data: Readable; contentType: string }
  | { kind: 'empty' };

/** Framework-neutral response consumed by an adapter. */
export interface NormalizedResponse {
  status: number;
  headers: Record<string, string>;
  cookies: string[];
  body: ResponseBody;
}

export interface RequestContext<B = unknown, Q = unknown, P = unknown> {
  body: B;
  query: Q;
  params: P;
  headers: Record<string, string | undefined>;
  cookies: Record<string, string>;
  ip: string;
  userAgent: string | null;
  requestId: string;
  auth: AuthContext | null;
  files: UploadedFile[];
  setCookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string, options?: CookieOptions): void;
}

/** Authenticated request context. */
export type AuthedContext<B = unknown, Q = unknown, P = unknown> = RequestContext<B, Q, P> & { auth: AuthContext };

export interface Reply {
  __reply: true;
  status: number;
  body: ResponseBody;
  headers?: Record<string, string>;
}

export interface UploadOptions {
  maxFiles: number;
  maxFileBytes: number;
  allowed: 'image' | 'document' | 'spreadsheet';
}

export interface RateLimitOptions {
  /** Unique bucket name, e.g. "auth:login". */
  name: string;
  windowSeconds: number;
  max: number;
  /** Bucket by user when authenticated (default: by IP). */
  by?: 'ip' | 'user';
}

type Infer<S> = S extends z.ZodType ? z.output<S> : unknown;

export interface RouteDefinition<
  SB extends z.ZodType | undefined = z.ZodType | undefined,
  SQ extends z.ZodType | undefined = z.ZodType | undefined,
  SP extends z.ZodType | undefined = z.ZodType | undefined,
> {
  method: HttpMethod;
  /** Express-style path relative to the API prefix, e.g. "/products/:id". Trailing "*name" = wildcard. */
  path: string;
  /** "public": no auth; "optional": auth if present; "required": 401 without a session. */
  auth?: 'public' | 'optional' | 'required';
  /** All listed permissions are required. */
  permissions?: Permission[];
  /** Require the caller to own a seller account (sellerId is then guaranteed). */
  seller?: boolean;
  schema?: { body?: SB; query?: SQ; params?: SP };
  upload?: UploadOptions;
  rateLimit?: RateLimitOptions;
  /** Mutating routes enforce CSRF for cookie sessions by default. */
  csrf?: boolean;
  /** Mount outside the /api/v1 prefix (e.g. /health, /uploads). */
  rootLevel?: boolean;
  docs?: { tags?: string[]; summary?: string; description?: string };
  handler: (ctx: RequestContext<Infer<SB>, Infer<SQ>, Infer<SP>>) => Promise<unknown>;
}

export type AnyRoute = RouteDefinition<any, any, any>;
