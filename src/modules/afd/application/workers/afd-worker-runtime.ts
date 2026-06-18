import { Worker, type Job } from "bullmq";

import {
  AFD_QUEUE_NAME,
  afdConnection,
  type ProcessarArquivoAfdJob,
} from "../queues/afd-queue";
import { processarArquivoAfdService } from "../services/processar-arquivo-afd.service";

type AfdWorkerGlobal = typeof globalThis & {
  __secpAfdWorker?: Worker<ProcessarArquivoAfdJob>;
};

function workerEstaAtivo(worker: Worker<ProcessarArquivoAfdJob>) {
  return !worker.closing;
}

async function processarJobAfd(job: Job<ProcessarArquivoAfdJob>) {
  console.log("[AFD] Processando job:", job.id, job.data);

  await processarArquivoAfdService({
    arquivoAfdId: job.data.arquivoAfdId,
    usuarioId: job.data.usuarioId ?? null,
  });

  console.log("[AFD] Job finalizado:", job.id);
}

export function criarAfdWorker() {
  const worker = new Worker<ProcessarArquivoAfdJob>(
    AFD_QUEUE_NAME,
    processarJobAfd,
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
    console.log("[AFD] Job concluido:", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[AFD] Job falhou:", job?.id, error);
  });

  worker.on("error", (error) => {
    console.error("[AFD] Erro no worker:", error);
  });

  return worker;
}

export function garantirAfdWorkerAutomatico() {
  if (process.env.AFD_AUTO_WORKER === "false") {
    return null;
  }

  const globalAfd = globalThis as AfdWorkerGlobal;

  if (globalAfd.__secpAfdWorker && workerEstaAtivo(globalAfd.__secpAfdWorker)) {
    return globalAfd.__secpAfdWorker;
  }

  globalAfd.__secpAfdWorker = criarAfdWorker();

  console.log(
    "[AFD] Worker automatico iniciado pelo processo web.",
    afdConnection.host,
    afdConnection.port,
  );

  return globalAfd.__secpAfdWorker;
}
