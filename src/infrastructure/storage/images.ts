import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { StorageProvider } from './storage';
import { EXTENSIONS } from './storage';

export interface StoredImage {
  key: string;
  url: string;
  thumbUrl: string;
}

/**
 * Re-encode an uploaded image: strips metadata (EXIF/GPS), bounds dimensions and converts to WebP.
 * Produces a large (≤1600px) and a small (≤480px) rendition: `<key>.webp` and `<key>-sm.webp`.
 * Re-encoding also neutralises polyglot files that merely start with valid image magic bytes.
 */
export async function storeOptimizedImage(
  storage: StorageProvider,
  folder: string,
  buffer: Buffer,
  mimeType: string,
): Promise<StoredImage> {
  const base = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}`;
  if (mimeType === 'image/gif') {
    const key = `${base}${EXTENSIONS['image/gif']}`;
    const obj = await storage.put(key, buffer, mimeType, 'public');
    return { key, url: obj.url, thumbUrl: obj.url };
  }
  const img = sharp(buffer, { failOn: 'error' }).rotate();
  const [large, small] = await Promise.all([
    img.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    img.clone().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  const key = `${base}.webp`;
  const [obj, thumb] = await Promise.all([
    storage.put(key, large, 'image/webp', 'public'),
    storage.put(`${base}-sm.webp`, small, 'image/webp', 'public'),
  ]);
  return { key, url: obj.url, thumbUrl: thumb.url };
}
