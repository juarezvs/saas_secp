import { Worker } from "bullmq";

import {
  REPROCESSAMENTO_GLOBAL_QUEUE_NAME,
  reprocessamentoGlobalConnection,
  type ReprocessamentoGlobalJob,
} from "../queues/reprocessamento-global-queue";
import { reprocessarTodosServidoresService } from "../services/reprocessar-todos-servidores.service";

type ReprocessamentoGlobalWorkerGlobal = typeof globalThis & {
  __secpReprocessamentoGlobalWorker?: Worker<ReprocessamentoGlobalJob>;
};

function workerEstaAtivo(worker: Worker<ReprocessamentoGlobalJob>) {
  return !worker.closing;
}

export function criarReprocessamentoGlobalWorker() {
  const concurrency = Math.max(
    Number(process.env.REPROCESSAMENTO_GLOBAL_CONCURRENCY ?? "1"),
    1,
  );
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
      concurrency,
    },
  );

  console.log("[REPROCESSAMENTO GLOBAL] Worker iniciado.");

  worker.on("completed", (job) => {
    console.log("[REPROCESSAMENTO GLOBAL] Job concluido:", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[REPROCESSAMENTO GLOBAL] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[REPROCESSAMENTO GLOBAL] Erro no worker:", error);
  });

  return worker;
}

export function garantirReprocessamentoGlobalWorkerAutomatico() {
  if (process.env.REPROCESSAMENTO_GLOBAL_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as ReprocessamentoGlobalWorkerGlobal;

  if (
    globalWorker.__secpReprocessamentoGlobalWorker &&
    workerEstaAtivo(globalWorker.__secpReprocessamentoGlobalWorker)
  ) {
    return globalWorker.__secpReprocessamentoGlobalWorker;
  }

  globalWorker.__secpReprocessamentoGlobalWorker =
    criarReprocessamentoGlobalWorker();

  return globalWorker.__secpReprocessamentoGlobalWorker;
}
