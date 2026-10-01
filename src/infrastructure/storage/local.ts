import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { hmac } from '../../shared/crypto';
import { assertSafeKey, CONTENT_TYPES, type StorageProvider, type Visibility } from './storage';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;
  private readonly root: string;

  constructor(
    uploadDir: string,
    private readonly signingSecret: string,
  ) {
    this.root = isAbsolute(uploadDir) ? uploadDir : resolve(process.cwd(), uploadDir);
  }

  private pathFor(key: string, visibility: Visibility) {
    assertSafeKey(key);
    return join(this.root, visibility, key);
  }

  async put(key: string, data: Buffer, _contentType: string, visibility: Visibility) {
    const p = this.pathFor(key, visibility);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    return { key, url: visibility === 'public' ? this.publicUrl(key) : `/files/private/${key}` };
  }

  async get(key: string, visibility: Visibility) {
    const p = this.pathFor(key, visibility);
    try {
      const s = await stat(p);
      if (!s.isFile()) return null;
    } catch {
      return null;
    }
    return {
      stream: createReadStream(p),
      contentType: CONTENT_TYPES[extname(p).toLowerCase()] ?? 'application/octet-stream',
    };
  }

  async delete(key: string, visibility: Visibility) {
    try {
      await unlink(this.pathFor(key, visibility));
    } catch {
      /* already gone */
    }
  }

  publicUrl(key: string) {
    return `/uploads/${key}`;
  }

  async signedUrl(key: string, ttlSeconds: number) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = hmac(this.signingSecret, `${key}:${exp}`);
    return `/files/private/${key}?exp=${exp}&sig=${sig}`;
  }

  verifySignature(key: string, exp: number, sig: string) {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    return hmac(this.signingSecret, `${key}:${exp}`) === sig;
  }
}
