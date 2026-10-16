import { Queue } from "bullmq";

export const CONTROL_ID_MONITOR_QUEUE_NAME = "control-id-monitor";
export type ControlIdMonitorJobData = { equipamentoId: string; eventoMonitorId: string };
export const controlIdMonitorConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"), maxRetriesPerRequest: null,
};
const queue = new Queue<ControlIdMonitorJobData>(CONTROL_ID_MONITOR_QUEUE_NAME, {
  connection: controlIdMonitorConnection,
  defaultJobOptions: {
    attempts: 5, backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86400, count: 2000 }, removeOnFail: { age: 604800, count: 2000 },
  },
});
export async function enfileirarMonitorControlId(data: ControlIdMonitorJobData) {
  const jobId = `monitor-${data.eventoMonitorId}`;
  const existente = await queue.getJob(jobId);
  if (existente) {
    if (["active", "waiting", "delayed", "paused"].includes(await existente.getState())) return existente;
    await existente.remove();
  }
  return queue.add("processar-monitor", data, { jobId });
}
