import { Queue } from "bullmq";

export const COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME =
  "coleta-relogio-progressiva";

export type ColetaRelogioProgressivaModo = "TODAS" | "SERVIDOR";

export type ColetaRelogioProgressivaJobData = {
  equipamentoId: string;
  modo: ColetaRelogioProgressivaModo;
  nsrInicial?: string | number | null;
  quantidadePorLote?: number | null;
  limiteLotes?: number | null;
  reprocessarAoFinal?: boolean | null;
  servidorBusca?: string | null;
  usuarioIdAuditoria?: string | null;
};

export type ColetaRelogioProgressivaProgress = {
  percentual: number;
  etapa: string;
  lotesExecutados: number;
  limiteLotes: number;
  recebidas: number;
  criadas: number;
  processadas: number;
  ignoradasPorFiltro: number;
  proximoNsr: string | null;
};

export const coletaRelogioProgressivaConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const coletaRelogioProgressivaQueue =
  new Queue<ColetaRelogioProgressivaJobData>(
    COLETA_RELOGIO_PROGRESSIVA_QUEUE_NAME,
    {
      connection: coletaRelogioProgressivaConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 200,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 1000,
        },
      },
    },
  );

export function progressoColetaAgendada(
  limiteLotes: number,
): ColetaRelogioProgressivaProgress {
  return {
    percentual: 0,
    etapa: "Aguardando worker de coleta iniciar.",
    lotesExecutados: 0,
    limiteLotes,
    recebidas: 0,
    criadas: 0,
    processadas: 0,
    ignoradasPorFiltro: 0,
    proximoNsr: null,
  };
}

export async function enfileirarColetaRelogioProgressiva(
  data: ColetaRelogioProgressivaJobData,
) {
  const jobId = `coleta-relogio-${data.equipamentoId}`;
  const existente = await coletaRelogioProgressivaQueue.getJob(jobId);

  if (existente) {
    const estado = await existente.getState();
    if (["active", "waiting", "delayed", "paused"].includes(estado)) {
      return existente;
    }

    await existente.remove();
  }

  return coletaRelogioProgressivaQueue.add("coletar-relogio", data, {
    jobId,
  });
}
