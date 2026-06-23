import "dotenv/config";

import { criarReprocessamentoGlobalWorker } from "../src/modules/marcacoes-brutas/application/workers/reprocessamento-global-worker-runtime";

const worker = criarReprocessamentoGlobalWorker();

async function encerrarWorker() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
