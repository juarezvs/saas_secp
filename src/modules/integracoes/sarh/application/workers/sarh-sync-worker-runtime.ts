import { Worker, type Job } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  SARH_SYNC_QUEUE_NAME,
  sarhSyncConnection,
  type SarhSyncJob,
} from "../queues/sarh-sync-queue";
import { SincronizarSarhUseCase } from "../use-cases/sincronizar-sarh.use-case";

type SarhSyncWorkerGlobal = typeof globalThis & {
  __secpSarhSyncWorker?: Worker<SarhSyncJob>;
  __secpSarhSyncWorkerVersion?: string;
};

const SARH_SYNC_WORKER_VERSION = "2026-07-01-chefias-sql";

function workerEstaAtivo(worker: Worker<SarhSyncJob>) {
  return !worker.closing;
}

async function processarSincronizacaoSarh(job: Job<SarhSyncJob>) {
  const useCase = new SincronizarSarhUseCase(prisma);

  const resultado = await useCase.execute({
    ...job.data,
    atualizarProgresso: async (progresso) => {
      await job.updateProgress(progresso);
    },
  });

  return resultado;
}

export function criarSarhSyncWorker() {
  const worker = new Worker<SarhSyncJob>(
    SARH_SYNC_QUEUE_NAME,
    processarSincronizacaoSarh,
    {
      connection: sarhSyncConnection,
      concurrency: Number(process.env.SARH_SYNC_CONCURRENCY ?? "1"),
    },
  );

  worker.on("ready", () => {
    console.log("[SARH SYNC] Worker pronto e aguardando jobs.");
  });

  worker.on("completed", (job) => {
    console.log("[SARH SYNC] Job concluido:", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[SARH SYNC] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[SARH SYNC] Erro no worker:", error);
  });

  return worker;
}

export async function garantirSarhSyncWorkerAutomatico() {
  if (process.env.SARH_SYNC_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as SarhSyncWorkerGlobal;

  if (
    globalWorker.__secpSarhSyncWorker &&
    workerEstaAtivo(globalWorker.__secpSarhSyncWorker) &&
    globalWorker.__secpSarhSyncWorkerVersion === SARH_SYNC_WORKER_VERSION
  ) {
    return globalWorker.__secpSarhSyncWorker;
  }

  if (
    globalWorker.__secpSarhSyncWorker &&
    workerEstaAtivo(globalWorker.__secpSarhSyncWorker)
  ) {
    await globalWorker.__secpSarhSyncWorker.close();
  }

  globalWorker.__secpSarhSyncWorker = criarSarhSyncWorker();
  globalWorker.__secpSarhSyncWorkerVersion = SARH_SYNC_WORKER_VERSION;

  return globalWorker.__secpSarhSyncWorker;
}
