import "dotenv/config";

import { iniciarHenryColetaWorker } from "../src/modules/integracoes/application/workers/henry-coleta-worker-runtime";
import { prisma } from "../src/shared/infrastructure/database/prisma";

const worker = iniciarHenryColetaWorker();

async function encerrar() {
  await worker.fechar();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => {
  void encerrar();
});

process.once("SIGTERM", () => {
  void encerrar();
});
