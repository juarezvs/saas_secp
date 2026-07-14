import { criarSarhLoginSyncWorker } from "@/modules/integracoes/sarh/application/workers/sarh-login-sync-worker-runtime";

const worker = criarSarhLoginSyncWorker();

async function encerrarWorker() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
