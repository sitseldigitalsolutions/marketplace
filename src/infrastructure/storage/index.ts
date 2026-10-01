import type { Env } from '../../config/env';
import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';
import type { StorageProvider } from './storage';

export function createStorage(env: Env): StorageProvider {
  if (env.STORAGE_PROVIDER === 's3') return new S3StorageProvider(env);
  return new LocalStorageProvider(env.LOCAL_UPLOAD_DIR, env.FILE_SIGNING_SECRET ?? env.JWT_ACCESS_SECRET);
}

export * from './storage';
export { LocalStorageProvider } from './local';
export { storeOptimizedImage } from './images';
