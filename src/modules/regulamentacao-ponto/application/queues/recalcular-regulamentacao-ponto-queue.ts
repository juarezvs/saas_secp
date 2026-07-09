import { Queue } from "bullmq";

export const RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME =
  "recalcular-regulamentacao-ponto-orgao";

export type RecalcularRegulamentacaoPontoJob = {
  orgaoId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string | null;
};

export type RecalcularRegulamentacaoPontoProgresso = {
  percentual: number;
  etapa: string;
  servidoresProcessados: number;
  totalServidores: number;
  servidoresIgnorados: number;
};

export const recalcularRegulamentacaoPontoConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const recalcularRegulamentacaoPontoQueue =
  new Queue<RecalcularRegulamentacaoPontoJob>(
    RECALCULAR_REGULAMENTACAO_PONTO_QUEUE_NAME,
    {
      connection: recalcularRegulamentacaoPontoConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 100,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 300,
        },
      },
    },
  );

export async function enfileirarRecalculoRegulamentacaoPonto(params: {
  orgaoId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string | null;
}) {
  return recalcularRegulamentacaoPontoQueue.add(
    "recalcular-regulamentacao-ponto-orgao",
    {
      orgaoId: params.orgaoId,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      usuarioIdAuditoria: params.usuarioIdAuditoria ?? null,
    },
    {
      jobId: `regulamentacao-${params.orgaoId}-${params.anoReferencia}-${String(
        params.mesReferencia,
      ).padStart(2, "0")}-${Date.now()}`,
    },
  );
}
