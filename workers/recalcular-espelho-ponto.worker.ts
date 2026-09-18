import "dotenv/config";

import { criarRecalcularEspelhoPontoWorker } from "../src/modules/recalculo/application/workers/recalcular-espelho-ponto-worker-runtime";

const worker = criarRecalcularEspelhoPontoWorker();

async function encerrarWorker() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
