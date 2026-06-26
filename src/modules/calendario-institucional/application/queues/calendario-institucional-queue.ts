import { Queue } from "bullmq";

export const CALENDARIO_INSTITUCIONAL_QUEUE_NAME =
  "calendario-institucional-reflexos";

export type CalendarioInstitucionalReflexosJob = {
  calendarioId: string;
  datasReferencia: string[];
  usuarioIdAuditoria?: string | null;
  calendarioEscopo?: {
    abrangencia: string;
    uf?: string | null;
    municipio?: string | null;
    municipioIbge?: string | null;
    orgaoId?: string | null;
    unidadeId?: string | null;
  } | null;
};

export type CalendarioInstitucionalReflexosProgresso = {
  percentual: number;
  etapa: string;
  datasProcessadas: number;
  totalDatas: number;
  servidoresImpactados: number;
};

export const calendarioInstitucionalConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

export const calendarioInstitucionalQueue =
  new Queue<CalendarioInstitucionalReflexosJob>(
    CALENDARIO_INSTITUCIONAL_QUEUE_NAME,
    {
      connection: calendarioInstitucionalConnection,
      defaultJobOptions: {
        attempts: 3,
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

function normalizarDatas(datasReferencia: Date[]) {
  return Array.from(
    new Set(
      datasReferencia.map((data) => data.toISOString().slice(0, 10)).sort(),
    ),
  );
}

export async function enfileirarReflexosCalendarioInstitucional(params: {
  calendarioId: string;
  datasReferencia: Date[];
  usuarioIdAuditoria?: string | null;
  calendarioEscopo?: CalendarioInstitucionalReflexosJob["calendarioEscopo"];
}) {
  const datasReferencia = normalizarDatas(params.datasReferencia);

  if (datasReferencia.length === 0) {
    return null;
  }

  return calendarioInstitucionalQueue.add(
    "recalcular-reflexos-calendario",
    {
      calendarioId: params.calendarioId,
      datasReferencia,
      usuarioIdAuditoria: params.usuarioIdAuditoria ?? null,
      calendarioEscopo: params.calendarioEscopo ?? null,
    },
    {
      jobId: `calendario-${params.calendarioId}-${Date.now()}`,
    },
  );
}
