import type { CookieOptions } from './types';

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name || name in out) continue;
    const raw = part.slice(idx + 1).trim().replace(/^"|"$/g, '');
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

export function serializeCookie(name: string, value: string, o: CookieOptions): string {
  if (!/^[A-Za-z0-9_\-.]+$/.test(name)) throw new Error(`Invalid cookie name: ${name}`);
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${o.path ?? '/'}`);
  if (o.domain) parts.push(`Domain=${o.domain}`);
  if (o.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${Math.floor(o.maxAgeSeconds)}`);
    parts.push(`Expires=${new Date(Date.now() + o.maxAgeSeconds * 1000).toUTCString()}`);
  }
  if (o.httpOnly) parts.push('HttpOnly');
  if (o.secure) parts.push('Secure');
  parts.push(`SameSite=${o.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}
