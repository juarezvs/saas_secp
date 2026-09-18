import { Worker, type Job } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularMesServidorService } from "../services/recalcular-mes-servidor.service";
import {
  RECALCULAR_ESPELHO_PONTO_QUEUE_NAME,
  recalcularEspelhoPontoConnection,
  type RecalcularEspelhoPontoJob,
} from "../queues/recalcular-espelho-ponto-queue";

async function atualizarEstado(
  job: Job<RecalcularEspelhoPontoJob>,
  data: Record<string, unknown>,
) {
  await prisma.processamentoEspelhoPonto.updateMany({
    where: {
      servidorId: job.data.servidorId,
      anoReferencia: job.data.anoReferencia,
      mesReferencia: job.data.mesReferencia,
      jobId: job.id,
    },
    data,
  });
}

async function processar(job: Job<RecalcularEspelhoPontoJob>) {
  await atualizarEstado(job, {
    status: "PROCESSANDO",
    iniciadoEm: new Date(),
    erro: null,
  });

  try {
    const resultado = await recalcularMesServidorService({
      servidorId: job.data.servidorId,
      anoReferencia: job.data.anoReferencia,
      mesReferencia: job.data.mesReferencia,
      usuarioIdAuditoria: job.data.solicitadoPorId ?? undefined,
      origem: `FILA_ESPELHO_${job.data.motivo}`,
    });

    await atualizarEstado(job, {
      status: "ATUALIZADO",
      concluidoEm: new Date(),
      erro: null,
    });
    return resultado;
  } catch (error) {
    await atualizarEstado(job, {
      status: "FALHA",
      concluidoEm: new Date(),
      erro: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function criarRecalcularEspelhoPontoWorker() {
  const worker = new Worker<RecalcularEspelhoPontoJob>(
    RECALCULAR_ESPELHO_PONTO_QUEUE_NAME,
    processar,
    {
      connection: recalcularEspelhoPontoConnection,
      concurrency: Number(process.env.ESPELHO_PONTO_WORKER_CONCURRENCY ?? "2"),
    },
  );

  worker.on("ready", () => console.log("[ESPELHO PONTO] Worker pronto."));
  worker.on("failed", (job, error) =>
    console.error("[ESPELHO PONTO] Job falhou:", job?.id, error),
  );
  worker.on("error", (error) =>
    console.error("[ESPELHO PONTO] Erro no worker:", error),
  );

  return worker;
}
