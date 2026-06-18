import "dotenv/config";

import { afdConnection } from "../src/modules/afd/application/queues/afd-queue";
import { criarAfdWorker } from "../src/modules/afd/application/workers/afd-worker-runtime";

console.log("[AFD] Worker iniciado.");
console.log("[AFD] Redis:", afdConnection.host, afdConnection.port);

const worker = criarAfdWorker();

async function encerrarWorker() {
  console.log("[AFD] Encerrando worker...");

  await worker.close();

  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
