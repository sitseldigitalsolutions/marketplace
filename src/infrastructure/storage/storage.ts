import type { Readable } from 'node:stream';

export type Visibility = 'public' | 'private';

export interface StoredObject {
  key: string;
  /** Public URL (public objects) or an API path that requires signing (private objects). */
  url: string;
}

/**
 * Object storage abstraction. `local` stores files on disk for development; `s3` works with
 * AWS S3 or any S3-compatible provider (MinIO, R2, Wasabi …).
 */
export interface StorageProvider {
  readonly name: 'local' | 's3';
  put(key: string, data: Buffer, contentType: string, visibility: Visibility): Promise<StoredObject>;
  get(key: string, visibility: Visibility): Promise<{ stream: Readable; contentType: string } | null>;
  delete(key: string, visibility: Visibility): Promise<void>;
  publicUrl(key: string): string;
  /** Time-limited URL for a private object. */
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
}

export const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

/** Reject keys that could escape the storage root. */
export function assertSafeKey(key: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$/.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error('Invalid storage key');
  }
}
