import { Queue } from "bullmq";

import type {
  SarhEndpointKey,
  SarhSyncProgress,
  TipoExecucaoSarh,
} from "../../domain/sarh.types";

export const SARH_SYNC_QUEUE_NAME = "sarh-sync";

export type SarhSyncJob = {
  tipo: TipoExecucaoSarh;
  modoSimulacao: boolean;
  orgaoId?: string | null;
  endpoints?: SarhEndpointKey[];
  matricula?: string;
  codigoUnidadeSarh?: number;
  codigosUnidadesSarhPermitidos?: number[];
  codigoCargoSarh?: number;
  iniciadoPorUsuarioId?: string | null;
  escopoSincronizacao?: {
    global: boolean;
    orgaoIds: string[];
  };
};

export const sarhSyncConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

let sarhSyncQueueInstance: Queue<SarhSyncJob> | null = null;

export function obterSarhSyncQueue() {
  sarhSyncQueueInstance ??= new Queue<SarhSyncJob>(SARH_SYNC_QUEUE_NAME, {
    connection: sarhSyncConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        age: 60 * 60 * 24,
        count: 100,
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 7,
        count: 500,
      },
    },
  });

  return sarhSyncQueueInstance;
}

export function progressoSarhAgendado(): SarhSyncProgress {
  return {
    percentualGeral: 0,
    percentualEndpoint: 0,
    endpointAtual: null,
    endpointIndice: 0,
    totalEndpoints: 0,
    etapa: "Aguardando worker SARH iniciar",
    status: "AGENDADA",
    contadores: {
      totalRecebidos: 0,
      totalCriados: 0,
      totalAtualizados: 0,
      totalInativados: 0,
      totalIgnorados: 0,
      totalErros: 0,
      totalConflitos: 0,
    },
  };
}

export async function enfileirarSincronizacaoSarh(job: SarhSyncJob) {
  const sarhSyncQueue = obterSarhSyncQueue();
  const jobsEmAndamento = await sarhSyncQueue.getJobs([
    "active",
    "waiting",
    "delayed",
  ]);
  const escopoJob = JSON.stringify(job.escopoSincronizacao ?? null);
  const existente = jobsEmAndamento.find((jobEmAndamento) => {
    const data = jobEmAndamento.data;

    return (
      JSON.stringify(data.escopoSincronizacao ?? null) === escopoJob &&
      data.orgaoId === job.orgaoId &&
      data.codigoUnidadeSarh === job.codigoUnidadeSarh &&
      JSON.stringify(data.codigosUnidadesSarhPermitidos ?? []) ===
        JSON.stringify(job.codigosUnidadesSarhPermitidos ?? []) &&
      data.matricula === job.matricula
    );
  });

  if (existente) {
    return existente;
  }

  return sarhSyncQueue.add("sincronizar-sarh", job, {
    jobId: `sarh-sync-${job.escopoSincronizacao?.global ? "global" : "orgao"}-${Date.now()}`,
  });
}
