import { Queue } from "bullmq";

export const SARH_LOGIN_SYNC_QUEUE_NAME = "sarh-login-sync";

export type AtualizarServidorSarhLoginJob = {
  matricula: string;
  usuarioId?: string | null;
};

export const sarhLoginSyncConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

let sarhLoginSyncQueueInstance: Queue<AtualizarServidorSarhLoginJob> | null =
  null;

export function obterSarhLoginSyncQueue() {
  sarhLoginSyncQueueInstance ??= new Queue<AtualizarServidorSarhLoginJob>(
    SARH_LOGIN_SYNC_QUEUE_NAME,
    {
      connection: sarhLoginSyncConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 5000,
        },
      },
    },
  );

  return sarhLoginSyncQueueInstance;
}

export async function enfileirarAtualizacaoSarhLogin(params: {
  matricula: string;
  usuarioId?: string | null;
}) {
  const matricula = params.matricula.trim().toUpperCase();

  if (!matricula) {
    return null;
  }

  return obterSarhLoginSyncQueue().add(
    "atualizar-servidor-login",
    {
      matricula,
      usuarioId: params.usuarioId ?? null,
    },
    {
      jobId: `sarh-login-${matricula}-${Date.now()}`,
      delay: Number(process.env.SARH_LOGIN_SYNC_DELAY_MS ?? "5000"),
    },
  );
}
