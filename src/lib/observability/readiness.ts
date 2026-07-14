import Redis from "ioredis";

import { prisma } from "@/shared/infrastructure/database/prisma";

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

type ReadyResult = {
  ok: boolean;
  checks: {
    postgres: CheckResult;
    redis: CheckResult;
  };
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function medirCheck(check: () => Promise<void>, timeoutMs: number) {
  const inicio = performance.now();

  try {
    await withTimeout(check(), timeoutMs);
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - inicio),
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - inicio),
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

function criarRedisClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 1000,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? "6379"),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    connectTimeout: 1000,
  });
}

export async function verificarProntidao(timeoutMs = 1200): Promise<ReadyResult> {
  const postgres = await medirCheck(async () => {
    await prisma.$queryRaw`SELECT 1`;
  }, timeoutMs);

  const redis = await medirCheck(async () => {
    const client = criarRedisClient();

    try {
      await client.connect();
      await client.ping();
    } finally {
      client.disconnect();
    }
  }, timeoutMs);

  return {
    ok: postgres.ok && redis.ok,
    checks: {
      postgres,
      redis,
    },
  };
}

