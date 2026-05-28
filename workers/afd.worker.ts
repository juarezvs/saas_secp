import "dotenv/config";
import { Worker } from "bullmq";
import {
  AFD_QUEUE_NAME,
  afdConnection,
  type ProcessarArquivoAfdJob,
} from "../src/modules/afd/application/queues/afd-queue";
import { processarArquivoAfdService } from "../src/modules/afd/application/services/processar-arquivo-afd.service";

console.log("[AFD] Worker iniciado.");
console.log(
  "[AFD] Redis:",
  process.env.REDIS_HOST ?? "127.0.0.1",
  process.env.REDIS_PORT ?? "6379",
);

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
    connection: afdConnection,
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
  await afdConnection.quit();
  process.exit(0);
});
