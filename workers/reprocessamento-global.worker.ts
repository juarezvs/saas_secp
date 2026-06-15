import "dotenv/config";

import { Worker } from "bullmq";

import {
  REPROCESSAMENTO_GLOBAL_QUEUE_NAME,
  reprocessamentoGlobalConnection,
  type ReprocessamentoGlobalJob,
} from "../src/modules/marcacoes-brutas/application/queues/reprocessamento-global-queue";
import { reprocessarTodosServidoresService } from "../src/modules/marcacoes-brutas/application/services/reprocessar-todos-servidores.service";

const worker = new Worker<ReprocessamentoGlobalJob>(
  REPROCESSAMENTO_GLOBAL_QUEUE_NAME,
  async (job) =>
    reprocessarTodosServidoresService({
      usuarioId: job.data.usuarioId,
      atualizarProgresso: async (progresso) => {
        await job.updateProgress(progresso);
      },
    }),
  {
    connection: reprocessamentoGlobalConnection,
    concurrency: 1,
  },
);

console.log("[REPROCESSAMENTO GLOBAL] Worker iniciado.");

worker.on("completed", (job) => {
  console.log("[REPROCESSAMENTO GLOBAL] Job concluído:", job.id);
});

worker.on("failed", (job, error) => {
  console.error("[REPROCESSAMENTO GLOBAL] Job falhou:", job?.id, error);
});

worker.on("error", (error) => {
  console.error("[REPROCESSAMENTO GLOBAL] Erro no worker:", error);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
