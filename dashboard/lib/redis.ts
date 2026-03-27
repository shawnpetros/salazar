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

// Persist across hot reloads in dev
const globalStore = (globalThis as Record<string, unknown>).__inMemoryRedisStore as Map<string, { value: unknown; expiresAt?: number }> | undefined;

class InMemoryRedis implements RedisLike {
  private store: Map<string, { value: unknown; expiresAt?: number }>;

  constructor() {
    if (globalStore) {
      this.store = globalStore;
    } else {
      this.store = new Map();
      (globalThis as Record<string, unknown>).__inMemoryRedisStore = this.store;
    }
  }

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
  // Vercel Marketplace provisions as KV_REST_API_URL/TOKEN
  // @upstash/redis expects UPSTASH_REDIS_REST_URL/TOKEN
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    console.log("[redis] Using Upstash Redis");
    return new Redis({ url, token }) as unknown as RedisLike;
  }
  console.log("[redis] No Redis credentials found — using in-memory store (local dev mode)");
  return new InMemoryRedis();
}

export const redis = createRedis();
