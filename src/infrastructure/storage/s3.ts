import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type { Env } from '../../config/env';
import { assertSafeKey, type StorageProvider, type Visibility } from './storage';

/**
 * S3 / S3-compatible storage. Public objects live under `public/`, private objects under `private/`.
 * Configure the bucket policy so only `public/*` is readable anonymously (or front it with a CDN).
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly env: Env) {
    this.bucket = env.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(env.AWS_S3_ENDPOINT),
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    });
  }

  private objectKey(key: string, visibility: Visibility) {
    assertSafeKey(key);
    return `${visibility}/${key}`;
  }

  async put(key: string, data: Buffer, contentType: string, visibility: Visibility) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key, visibility),
        Body: data,
        ContentType: contentType,
        CacheControl: visibility === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      }),
    );
    return { key, url: visibility === 'public' ? this.publicUrl(key) : `/files/private/${key}` };
  }

  async get(key: string, visibility: Visibility) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
      return { stream: res.Body as Readable, contentType: res.ContentType ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async delete(key: string, visibility: Visibility) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, visibility) }));
  }

  publicUrl(key: string) {
    const base =
      this.env.AWS_S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.env.AWS_REGION}.amazonaws.com`;
    return `${base.replace(/\/$/, '')}/public/${key}`;
  }

  signedUrl(key: string, ttlSeconds: number) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key, 'private') }), {
      expiresIn: ttlSeconds,
    });
  }
}
