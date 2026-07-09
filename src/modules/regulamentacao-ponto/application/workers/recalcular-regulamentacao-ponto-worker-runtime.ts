import { Worker, type Job } from "bullmq";

import {
  RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME,
  recalcularRegulamentacaoPontoConnection,
  type RecalcularRegulamentacaoPontoJob,
} from "../queues/recalcular-regulamentacao-ponto-queue";
import { recalcularCompetenciaRegulamentacaoPontoService } from "../services/recalcular-competencia-regulamentacao-ponto.service";

type RecalcularRegulamentacaoPontoWorkerGlobal = typeof globalThis & {
  __secpRecalcularRegulamentacaoPontoWorker?: Worker<RecalcularRegulamentacaoPontoJob>;
};

function workerEstaAtivo(worker: Worker<RecalcularRegulamentacaoPontoJob>) {
  return !worker.closing;
}

async function processarRecalculoRegulamentacaoPontoJob(
  job: Job<RecalcularRegulamentacaoPontoJob>,
) {
  console.log("[REGULAMENTACAO PONTO] Processando recalculo:", job.id, job.data);

  const resultado = await recalcularCompetenciaRegulamentacaoPontoService({
    orgaoId: job.data.orgaoId,
    anoReferencia: job.data.anoReferencia,
    mesReferencia: job.data.mesReferencia,
    usuarioIdAuditoria: job.data.usuarioIdAuditoria ?? undefined,
    atualizarProgresso: async (progresso) => {
      await job.updateProgress(progresso);
    },
  });

  console.log("[REGULAMENTACAO PONTO] Recalculo concluido:", job.id, resultado);
  return resultado;
}

export function criarRecalcularRegulamentacaoPontoWorker() {
  const worker = new Worker<RecalcularRegulamentacaoPontoJob>(
    RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME,
    processarRecalculoRegulamentacaoPontoJob,
    {
      connection: recalcularRegulamentacaoPontoConnection,
      concurrency: 1,
    },
  );

  worker.on("ready", () => {
    console.log("[REGULAMENTACAO PONTO] Worker pronto e aguardando jobs.");
  });

  worker.on("completed", (job) => {
    console.log("[REGULAMENTACAO PONTO] Job concluido:", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[REGULAMENTACAO PONTO] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[REGULAMENTACAO PONTO] Erro no worker:", error);
  });

  return worker;
}

export function garantirRecalcularRegulamentacaoPontoWorkerAutomatico() {
  if (process.env.REGULAMENTACAO_PONTO_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker =
    globalThis as RecalcularRegulamentacaoPontoWorkerGlobal;

  if (
    globalWorker.__secpRecalcularRegulamentacaoPontoWorker &&
    workerEstaAtivo(globalWorker.__secpRecalcularRegulamentacaoPontoWorker)
  ) {
    return globalWorker.__secpRecalcularRegulamentacaoPontoWorker;
  }

  globalWorker.__secpRecalcularRegulamentacaoPontoWorker =
    criarRecalcularRegulamentacaoPontoWorker();

  return globalWorker.__secpRecalcularRegulamentacaoPontoWorker;
}
