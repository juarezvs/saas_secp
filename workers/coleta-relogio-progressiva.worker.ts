import {
  criarColetaRelogioProgressivaWorker,
  iniciarAgendadorColetaRelogioPeriodica,
} from "@/modules/integracoes/application/workers/coleta-relogio-progressiva-worker-runtime";

const worker = criarColetaRelogioProgressivaWorker();
const agendador = iniciarAgendadorColetaRelogioPeriodica();

async function encerrarWorker() {
  agendador?.fechar();
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
