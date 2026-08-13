import Redis from "ioredis";

const globalForRedisCache = globalThis as unknown as {
  __secpRedisCache?: Redis;
};

function criarRedisCacheClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? "6379"),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
}

function redisCache() {
  globalForRedisCache.__secpRedisCache ??= criarRedisCacheClient();
  return globalForRedisCache.__secpRedisCache;
}

export function obterRedisCacheClient() {
  return redisCache();
}

export async function obterCacheJson<T>(key: string): Promise<T | null> {
  try {
    const value = await redisCache().get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function definirCacheJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
) {
  try {
    await redisCache().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    return;
  }
}

export async function removerCache(prefixOrKey: string) {
  try {
    if (!prefixOrKey.endsWith("*")) {
      await redisCache().del(prefixOrKey);
      return;
    }

    const keys = await redisCache().keys(prefixOrKey);
    if (keys.length > 0) {
      await redisCache().del(...keys);
    }
  } catch {
    return;
  }
}
