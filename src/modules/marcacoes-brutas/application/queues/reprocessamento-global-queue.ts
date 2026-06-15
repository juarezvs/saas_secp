import { Queue } from "bullmq";

export const REPROCESSAMENTO_GLOBAL_QUEUE_NAME =
  "marcacoes-brutas-reprocessamento-global";

export type ReprocessamentoGlobalJob = {
  usuarioId: string;
};

export type ReprocessamentoGlobalProgresso = {
  percentual: number;
  etapa: string;
  processadas: number;
  pendentesAnalisadas: number;
  competenciasRecalculadas: number;
  totalCompetencias: number;
  erros: number;
};

export const reprocessamentoGlobalConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const reprocessamentoGlobalQueue =
  new Queue<ReprocessamentoGlobalJob>(
    REPROCESSAMENTO_GLOBAL_QUEUE_NAME,
    {
      connection: reprocessamentoGlobalConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 50,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 100,
        },
      },
    },
  );

export async function enfileirarReprocessamentoGlobal(usuarioId: string) {
  const jobsEmAndamento = await reprocessamentoGlobalQueue.getJobs([
    "active",
    "waiting",
    "delayed",
  ]);
  const existente = jobsEmAndamento[0];

  if (existente) {
    return existente;
  }

  return reprocessamentoGlobalQueue.add(
    "reprocessar-todos",
    { usuarioId },
    { jobId: `reprocessamento-global-${Date.now()}` },
  );
}
