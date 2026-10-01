import type { Redis } from 'ioredis';

/**
 * Cache for PUBLIC, non-personalised data only (categories, homepage, product pages).
 * Never cache responses that depend on the caller's identity or seller scope.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delPrefix(prefix: string): Promise<void>;
}

export class MemoryCache implements CacheProvider {
  private store = new Map<string, { value: unknown; expires: number }>();
  async get<T>(key: string) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }
  async set(key: string, value: unknown, ttlSeconds: number) {
    if (this.store.size > 5000) this.store.clear();
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
  async delPrefix(prefix: string) {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
}

export class RedisCache implements CacheProvider {
  constructor(private readonly redis: Redis) {}
  async get<T>(key: string) {
    const raw = await this.redis.get(`cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }
  async set(key: string, value: unknown, ttlSeconds: number) {
    await this.redis.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  }
  async delPrefix(prefix: string) {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `cache:${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== '0');
  }
}

/** Disabled in tests so assertions always see fresh data. */
export class NoopCache implements CacheProvider {
  async get<T>() {
    return undefined as T | undefined;
  }
  async set() {}
  async delPrefix() {}
}
