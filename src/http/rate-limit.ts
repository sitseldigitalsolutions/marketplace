import type { Redis } from 'ioredis';

export interface RateLimitHit {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  hit(key: string, windowSeconds: number): Promise<RateLimitHit>;
  reset(key: string): Promise<void>;
}

/** Fixed-window counter held in process memory (single instance / development). */
export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, RateLimitHit>();
  private timer: NodeJS.Timeout;

  constructor() {
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
    }, 60_000);
    this.timer.unref();
  }

  async hit(key: string, windowSeconds: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }
}

/** Shared counter for multi-instance deployments (REDIS_ENABLED=true). */
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async hit(key: string, windowSeconds: number) {
    const k = `rl:${key}`;
    const results = await this.redis.multi().incr(k).pttl(k).exec();
    const count = Number(results?.[0]?.[1] ?? 1);
    let ttl = Number(results?.[1]?.[1] ?? -1);
    if (ttl < 0) {
      await this.redis.pexpire(k, windowSeconds * 1000);
      ttl = windowSeconds * 1000;
    }
    return { count, resetAt: Date.now() + ttl };
  }

  async reset(key: string) {
    await this.redis.del(`rl:${key}`);
  }
}
