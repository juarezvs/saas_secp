import { Worker, type Job } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { SincronizarSarhUseCase } from "../use-cases/sincronizar-sarh.use-case";
import {
  SARH_LOGIN_SYNC_QUEUE_NAME,
  sarhLoginSyncConnection,
  type AtualizarServidorSarhLoginJob,
} from "../queues/sarh-login-sync-queue";

type SarhLoginSyncWorkerGlobal = typeof globalThis & {
  __secpSarhLoginSyncWorker?: Worker<AtualizarServidorSarhLoginJob>;
};

function workerEstaAtivo(worker: Worker<AtualizarServidorSarhLoginJob>) {
  return !worker.closing;
}

async function processarAtualizacaoSarhLogin(
  job: Job<AtualizarServidorSarhLoginJob>,
) {
  const matricula = job.data.matricula.trim().toUpperCase();

  if (!matricula) {
    return;
  }

  console.log("[SARH LOGIN] Atualizando arvore funcional:", matricula);

  const usuario = job.data.usuarioId
    ? await prisma.usuario.findUnique({
        where: { id: job.data.usuarioId },
        select: { servidor: { select: { orgaoId: true } } },
      })
    : null;
  const useCase = new SincronizarSarhUseCase(prisma);
  await useCase.execute({
    tipo: "SINCRONIZACAO_INCREMENTAL",
    modoSimulacao: false,
    orgaoId: usuario?.servidor?.orgaoId ?? null,
    matricula,
    iniciadoPorUsuarioId: job.data.usuarioId ?? null,
    endpoints: [
      "lotacoes",
      "cargos",
      "servidores",
      "lotacoesServidores",
      "tiposAfastamento",
      "afastamentos",
      "chefias",
      "calendarios",
    ],
  });

  console.log("[SARH LOGIN] Atualizacao concluida:", matricula);
}

export function criarSarhLoginSyncWorker() {
  const worker = new Worker<AtualizarServidorSarhLoginJob>(
    SARH_LOGIN_SYNC_QUEUE_NAME,
    processarAtualizacaoSarhLogin,
    {
      connection: sarhLoginSyncConnection,
      concurrency: Number(process.env.SARH_LOGIN_SYNC_CONCURRENCY ?? "1"),
    },
  );

  worker.on("ready", () => {
    console.log("[SARH LOGIN] Worker pronto e aguardando jobs.");
  });

  worker.on("failed", (job, error) => {
    console.error("[SARH LOGIN] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[SARH LOGIN] Erro no worker:", error);
  });

  return worker;
}

export function garantirSarhLoginSyncWorkerAutomatico() {
  if (process.env.SARH_LOGIN_SYNC_AUTO_WORKER === "false") {
    return null;
  }

  const globalWorker = globalThis as SarhLoginSyncWorkerGlobal;

  if (
    globalWorker.__secpSarhLoginSyncWorker &&
    workerEstaAtivo(globalWorker.__secpSarhLoginSyncWorker)
  ) {
    return globalWorker.__secpSarhLoginSyncWorker;
  }

  globalWorker.__secpSarhLoginSyncWorker = criarSarhLoginSyncWorker();

  return globalWorker.__secpSarhLoginSyncWorker;
}
