import { randomUUID } from "node:crypto";

import { obterRedisCacheClient } from "@/lib/cache/redis-cache";

const PREFIXO = "secp:relogio-ponto:lock:";
const liberarSeToken = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;
const renovarSeToken = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
  end
  return 0
`;

function aguardar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executarComLockDistribuidoEquipamento<T>(
  equipamentoId: string,
  operacao: () => Promise<T>,
) {
  if (process.env.RELOGIO_PONTO_DISTRIBUTED_LOCK_ENABLED === "false") {
    return operacao();
  }

  const redis = obterRedisCacheClient();
  const chave = `${PREFIXO}${equipamentoId}`;
  const token = randomUUID();
  const ttlMs = Math.max(
    Number(process.env.RELOGIO_PONTO_LOCK_TTL_MS ?? 300000),
    30000,
  );
  const esperaMaximaMs = Math.max(
    Number(process.env.RELOGIO_PONTO_LOCK_WAIT_MS ?? 10000),
    0,
  );
  const inicio = Date.now();
  let adquirido = false;
  let ultimoErro: unknown = null;

  do {
    try {
      adquirido = (await redis.set(chave, token, "PX", ttlMs, "NX")) === "OK";
      ultimoErro = null;
    } catch (error) {
      ultimoErro = error;
    }
    if (!adquirido && Date.now() - inicio < esperaMaximaMs) {
      await aguardar(200);
    }
  } while (!adquirido && Date.now() - inicio < esperaMaximaMs);

  if (!adquirido) {
    if (ultimoErro) {
      throw new Error(
        `Nao foi possivel obter o lock distribuido do equipamento: ${
          ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro)
        }`,
      );
    }
    throw new Error("Equipamento ocupado por outra coleta em execucao.");
  }

  const renovacao = setInterval(() => {
    void redis
      .eval(renovarSeToken, 1, chave, token, String(ttlMs))
      .catch((error) =>
        console.error(
          `[RELOGIO LOCK] Falha ao renovar lock ${equipamentoId}:`,
          error,
        ),
      );
  }, Math.max(Math.floor(ttlMs / 3), 10000));
  renovacao.unref?.();

  try {
    return await operacao();
  } finally {
    clearInterval(renovacao);
    await redis.eval(liberarSeToken, 1, chave, token).catch((error) =>
      console.error(
        `[RELOGIO LOCK] Falha ao liberar lock ${equipamentoId}:`,
        error,
      ),
    );
  }
}
