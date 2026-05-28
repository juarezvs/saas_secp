import { Queue } from "bullmq";
import IORedis from "ioredis";

export const AFD_QUEUE_NAME = "afd-importacao" as const;
export const AFD_JOB_PROCESSAR_ARQUIVO = "processar-arquivo-afd" as const;

export type ProcessarArquivoAfdJob = {
  arquivoAfdId: string;
  usuarioId?: string | null;
};

export const afdConnection = new IORedis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const afdQueue: Queue<ProcessarArquivoAfdJob> =
  new Queue<ProcessarArquivoAfdJob>(AFD_QUEUE_NAME, {
    connection: afdConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
