import type { JobType, Queue } from "bullmq";

import {
  afdQueue,
  AFD_QUEUE_NAME,
} from "@/modules/afd/application/queues/afd-queue";
import {
  calendarioInstitucionalQueue,
  CALENDARIO_INSTITUCIONAL_QUEUE_NAME,
} from "@/modules/calendario-institucional/application/queues/calendario-institucional-queue";
import {
  reprocessamentoGlobalQueue,
  REPROCESSAMENTO_GLOBAL_QUEUE_NAME,
} from "@/modules/marcacoes-brutas/application/queues/reprocessamento-global-queue";
import {
  recalcularRegulamentacaoPontoQueue,
  RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME,
} from "@/modules/regulamentacao-ponto/application/queues/recalcular-regulamentacao-ponto-queue";
import {
  obterSarhLoginSyncQueue,
  SARH_LOGIN_SYNC_QUEUE_NAME,
} from "@/modules/integracoes/sarh/application/queues/sarh-login-sync-queue";
import {
  obterSarhSyncQueue,
  SARH_SYNC_QUEUE_NAME,
} from "@/modules/integracoes/sarh/application/queues/sarh-sync-queue";
import {
  coletaRelogioProgressivaQueue,
  COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME,
} from "@/modules/integracoes/application/queues/coleta-relogio-progressiva-queue";
import {
  relatorioExportacaoQueue,
  RELATORIO_EXPORTACAO_QUEUE_NAME,
} from "@/modules/relatorios/application/queues/relatorio-exportacao-queue";

import { logger } from "./logger";
import { obterObservabilidade } from "./metrics";

type QueueMetric = {
  nome: string;
  fila: Queue;
};

const ESTADOS: JobType[] = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
];

function filasMonitoradas(): QueueMetric[] {
  return [
    { nome: AFD_QUEUE_NAME, fila: afdQueue as Queue },
    {
      nome: CALENDARIO_INSTITUCIONAL_QUEUE_NAME,
      fila: calendarioInstitucionalQueue as Queue,
    },
    { nome: REPROCESSAMENTO_GLOBAL_QUEUE_NAME, fila: reprocessamentoGlobalQueue as Queue },
    {
      nome: RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME,
      fila: recalcularRegulamentacaoPontoQueue as Queue,
    },
    { nome: SARH_LOGIN_SYNC_QUEUE_NAME, fila: obterSarhLoginSyncQueue() as Queue },
    { nome: SARH_SYNC_QUEUE_NAME, fila: obterSarhSyncQueue() as Queue },
    {
      nome: COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME,
      fila: coletaRelogioProgressivaQueue as Queue,
    },
    {
      nome: RELATORIO_EXPORTACAO_QUEUE_NAME,
      fila: relatorioExportacaoQueue as Queue,
    },
  ];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function coletarMetricasFilas(timeoutMs = 1200) {
  const observabilidade = obterObservabilidade();

  await Promise.all(
    filasMonitoradas().map(async ({ nome, fila }) => {
      try {
        const counts = await withTimeout(
          fila.getJobCounts(...ESTADOS),
          timeoutMs,
        );

        for (const estado of ESTADOS) {
          observabilidade.queueJobs.set(
            { queue: nome, state: estado },
            Number(counts[estado] ?? 0),
          );
        }

        observabilidade.queueHealthy.set({ queue: nome }, 1);
      } catch (error) {
        observabilidade.queueHealthy.set({ queue: nome }, 0);
        observabilidade.applicationErrorsTotal.inc({
          area: "queue_metrics",
          kind: "collection_failed",
        });
        logger.error("Falha ao coletar metricas de fila", {
          queue: nome,
          error,
        });
      }
    }),
  );
}
