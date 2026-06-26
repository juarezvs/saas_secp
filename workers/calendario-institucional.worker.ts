import "dotenv/config";

import { criarCalendarioInstitucionalWorker } from "../src/modules/calendario-institucional/application/workers/calendario-institucional-worker-runtime";

const worker = criarCalendarioInstitucionalWorker();

async function encerrarWorker() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
