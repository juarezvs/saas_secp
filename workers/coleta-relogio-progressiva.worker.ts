import {
  criarColetaRelogioProgressivaWorker,
  iniciarAgendadorColetaRelogioPeriodica,
} from "@/modules/integracoes/application/workers/coleta-relogio-progressiva-worker-runtime";
import { criarControlIdMonitorWorker } from "@/modules/integracoes/application/workers/control-id-monitor-worker-runtime";

const worker = criarColetaRelogioProgressivaWorker();
const monitor = criarControlIdMonitorWorker();
const agendador = iniciarAgendadorColetaRelogioPeriodica();

async function encerrarWorker() {
  agendador?.fechar();
  await worker.close();
  await monitor.close();
  process.exit(0);
}

process.on("SIGINT", encerrarWorker);
process.on("SIGTERM", encerrarWorker);
