import "dotenv/config";

import { Worker } from "bullmq";

import {
  AFD_QUEUE_NAME,
  type ProcessarArquivoAfdJob,
} from "../src/modules/afd/application/queues/afd-queue";
import { processarArquivoAfdService } from "../src/modules/afd/application/services/processar-arquivo-afd.service";

const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

console.log("[AFD] Worker iniciado.");
console.log("[AFD] Redis:", redisConnection.host, redisConnection.port);

const worker = new Worker<ProcessarArquivoAfdJob>(
  AFD_QUEUE_NAME,
  async (job) => {
    console.log("[AFD] Processando job:", job.id, job.data);

    await processarArquivoAfdService({
      arquivoAfdId: job.data.arquivoAfdId,
      usuarioId: job.data.usuarioId ?? null,
    });

    console.log("[AFD] Job finalizado:", job.id);
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
);

worker.on("ready", () => {
  console.log("[AFD] Worker pronto e aguardando jobs.");
});

worker.on("active", (job) => {
  console.log("[AFD] Job ativo:", job.id);
});

worker.on("completed", (job) => {
  console.log("[AFD] Job concluído:", job.id);
});

worker.on("failed", (job, error) => {
  console.error("[AFD] Job falhou:", job?.id, error);
});

worker.on("error", (error) => {
  console.error("[AFD] Erro no worker:", error);
});

process.on("SIGINT", async () => {
  console.log("[AFD] Encerrando worker...");

  await worker.close();

  process.exit(0);
});
