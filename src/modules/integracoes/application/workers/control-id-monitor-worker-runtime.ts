import { Worker } from "bullmq";
import { CONTROL_ID_MONITOR_QUEUE_NAME, controlIdMonitorConnection, type ControlIdMonitorJobData } from "../queues/control-id-monitor-queue";
import { processarEventoMonitorControlId } from "../services/relogios-ponto/control-id-monitor.service";

export function criarControlIdMonitorWorker() {
  const worker = new Worker<ControlIdMonitorJobData>(CONTROL_ID_MONITOR_QUEUE_NAME,
    (job) => processarEventoMonitorControlId(job.data),
    { connection: controlIdMonitorConnection, concurrency: 2 });
  worker.on("failed", (job) => console.error("[CONTROL ID MONITOR] Processamento pendente", { eventoId: job?.data.eventoMonitorId, tentativa: job?.attemptsMade }));
  return worker;
}
