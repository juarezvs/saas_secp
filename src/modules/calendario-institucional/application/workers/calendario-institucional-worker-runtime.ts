import { Worker, type Job } from "bullmq";

import {
  CALENDARIO_INSTITUCIONAL_QUEUE_NAME,
  calendarioInstitucionalConnection,
  type CalendarioInstitucionalReflexosJob,
} from "../queues/calendario-institucional-queue";
import { recalcularReflexosCalendarioInstitucional } from "../services/recalcular-calendario-institucional.service";

type CalendarioInstitucionalWorkerGlobal = typeof globalThis & {
  __secpCalendarioInstitucionalWorker?: Worker<CalendarioInstitucionalReflexosJob>;
};

function workerEstaAtivo(worker: Worker<CalendarioInstitucionalReflexosJob>) {
  return !worker.closing;
}

function dataIsoParaUtc(data: string) {
  return new Date(`${data}T00:00:00.000Z`);
}

async function processarReflexosCalendarioJob(
  job: Job<CalendarioInstitucionalReflexosJob>,
) {
  console.log("[CALENDARIO] Processando reflexos:", job.id, job.data);

  const resultado = await recalcularReflexosCalendarioInstitucional({
    calendarioId: job.data.calendarioId,
    calendarioEscopo: job.data.calendarioEscopo ?? undefined,
    datasReferencia: job.data.datasReferencia.map(dataIsoParaUtc),
    usuarioIdAuditoria: job.data.usuarioIdAuditoria ?? undefined,
    atualizarProgresso: async (progresso) => {
      await job.updateProgress(progresso);
    },
  });

  console.log("[CALENDARIO] Reflexos concluidos:", job.id);
  return resultado;
}

export function criarCalendarioInstitucionalWorker() {
  const worker = new Worker<CalendarioInstitucionalReflexosJob>(
    CALENDARIO_INSTITUCIONAL_QUEUE_NAME,
    processarReflexosCalendarioJob,
    {
      connection: calendarioInstitucionalConnection,
      concurrency: 1,
    },
  );

  worker.on("ready", () => {
    console.log("[CALENDARIO] Worker pronto e aguardando jobs.");
  });

  worker.on("completed", (job) => {
    console.log("[CALENDARIO] Job concluido:", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[CALENDARIO] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[CALENDARIO] Erro no worker:", error);
  });

  return worker;
}

export function garantirCalendarioInstitucionalWorkerAutomatico() {
  if (process.env.CALENDARIO_INSTITUCIONAL_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as CalendarioInstitucionalWorkerGlobal;

  if (
    globalWorker.__secpCalendarioInstitucionalWorker &&
    workerEstaAtivo(globalWorker.__secpCalendarioInstitucionalWorker)
  ) {
    return globalWorker.__secpCalendarioInstitucionalWorker;
  }

  globalWorker.__secpCalendarioInstitucionalWorker =
    criarCalendarioInstitucionalWorker();

  return globalWorker.__secpCalendarioInstitucionalWorker;
}
