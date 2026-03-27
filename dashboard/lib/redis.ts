import { Redis } from "@upstash/redis";

/**
 * Redis client with in-memory fallback for local development.
 * When UPSTASH_REDIS_REST_URL is not set, uses a Map-based mock.
 */

interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<string>;
  mget<T = unknown>(...keys: string[]): Promise<(T | null)[]>;
  del(key: string): Promise<number>;
}

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<string> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

function createRedis(): RedisLike {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    console.log("[redis] Using Upstash Redis");
    return Redis.fromEnv() as unknown as RedisLike;
  }
  console.log("[redis] No UPSTASH_REDIS_REST_URL — using in-memory store (local dev mode)");
  return new InMemoryRedis();
}

export const redis = createRedis();
