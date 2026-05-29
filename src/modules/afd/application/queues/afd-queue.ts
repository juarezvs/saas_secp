import { Queue } from "bullmq";

export const AFD_QUEUE_NAME = "afd-processamento";

export type ProcessarArquivoAfdJob = {
  arquivoAfdId: string;
  usuarioId?: string | null;
};

export const afdConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const afdQueue = new Queue<ProcessarArquivoAfdJob>(AFD_QUEUE_NAME, {
  connection: afdConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
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
});

export async function enfileirarProcessamentoArquivoAfd(params: {
  arquivoAfdId: string;
  usuarioId?: string | null;
}) {
  return afdQueue.add(
    "processar-arquivo-afd",
    {
      arquivoAfdId: params.arquivoAfdId,
      usuarioId: params.usuarioId ?? null,
    },
    {
      jobId: `afd:${params.arquivoAfdId}`,
    },
  );
}
