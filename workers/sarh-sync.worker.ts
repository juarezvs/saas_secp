import { criarSarhSyncWorker } from "@/modules/integracoes/sarh/application/workers/sarh-sync-worker-runtime";

const worker = criarSarhSyncWorker();

async function encerrarWorker() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
