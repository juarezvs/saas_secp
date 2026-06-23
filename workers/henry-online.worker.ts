import "dotenv/config";

import { iniciarHenryOnlineWorker } from "../src/modules/integracoes/application/workers/henry-online-worker-runtime";
import { prisma } from "../src/shared/infrastructure/database/prisma";

const worker = iniciarHenryOnlineWorker();

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
