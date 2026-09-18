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
  escopoChave?: string;
  unidadeIdsEscopo?: string[];
  origemSolicitacao?: "AUTOMATICA_TELA_FERIAS" | "MANUAL_TELA_FERIAS";
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
    atualizadoEm: new Date().toISOString(),
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

function limiteJobAtivoSemProgressoMs() {
  const minutos = Number(process.env.SARH_SYNC_STALE_JOB_MINUTES ?? "15");

  return Math.max(Number.isFinite(minutos) ? minutos : 15, 1) * 60 * 1000;
}

function progressoAtualizadoEm(progresso: unknown) {
  if (!progresso || typeof progresso !== "object") {
    return null;
  }

  const atualizadoEm = (progresso as { atualizadoEm?: unknown }).atualizadoEm;

  return typeof atualizadoEm === "string" ? Date.parse(atualizadoEm) : null;
}

async function jobAtivoSemProgresso(
  job: Awaited<ReturnType<Queue<SarhSyncJob>["getJob"]>>,
) {
  if (!job || (await job.getState()) !== "active") {
    return false;
  }

  const referencia =
    progressoAtualizadoEm(job.progress) ?? job.processedOn ?? job.timestamp;

  return Date.now() - referencia > limiteJobAtivoSemProgressoMs();
}

function mesmoEscopoOperacional(
  jobExistente: SarhSyncJob,
  novoJob: SarhSyncJob,
) {
  if (jobExistente.escopoChave || novoJob.escopoChave) {
    return (
      Boolean(jobExistente.escopoChave) &&
      jobExistente.escopoChave === novoJob.escopoChave
    );
  }

  if ((jobExistente.orgaoId ?? null) !== (novoJob.orgaoId ?? null)) {
    return false;
  }

  if ((jobExistente.matricula ?? null) || (novoJob.matricula ?? null)) {
    return (jobExistente.matricula ?? null) === (novoJob.matricula ?? null);
  }

  if (
    (jobExistente.codigoUnidadeSarh ?? null) ||
    (novoJob.codigoUnidadeSarh ?? null)
  ) {
    return (
      (jobExistente.codigoUnidadeSarh ?? null) ===
      (novoJob.codigoUnidadeSarh ?? null)
    );
  }

  return (
    JSON.stringify(jobExistente.escopoSincronizacao ?? null) ===
    JSON.stringify(novoJob.escopoSincronizacao ?? null)
  );
}

function chaveAtualizacaoAutomatica(escopoChave: string) {
  return `sarh:ferias:auto:${escopoChave}`;
}

export async function obterJobAtualizacaoAutomaticaSarh(
  escopoChave: string,
) {
  const redis = await obterSarhSyncQueue().client;
  return redis.get(chaveAtualizacaoAutomatica(escopoChave));
}

export async function registrarJobAtualizacaoAutomaticaSarh(params: {
  escopoChave: string;
  jobId: string;
}) {
  const redis = await obterSarhSyncQueue().client;
  const minutos = Number(process.env.SARH_FERIAS_AUTO_INTERVAL_MINUTES ?? "30");
  const ttlSegundos = Math.max(Number.isFinite(minutos) ? minutos : 30, 1) * 60;

  await redis.set(
    chaveAtualizacaoAutomatica(params.escopoChave),
    params.jobId,
    { EX: ttlSegundos },
  );
}

export async function enfileirarSincronizacaoSarh(job: SarhSyncJob) {
  const sarhSyncQueue = obterSarhSyncQueue();
  const jobsEmAndamento = await sarhSyncQueue.getJobs([
    "active",
    "waiting",
    "delayed",
  ]);
  const candidatos = await Promise.all(
    jobsEmAndamento
      .filter((jobEmAndamento) =>
        mesmoEscopoOperacional(jobEmAndamento.data, job),
      )
      .map(async (jobEmAndamento) => ({
        job: jobEmAndamento,
        ativoSemProgresso: await jobAtivoSemProgresso(jobEmAndamento),
      })),
  );
  const existente = candidatos
    .filter((candidato) => !candidato.ativoSemProgresso)
    .map((candidato) => candidato.job)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (existente) {
    return existente;
  }

  return sarhSyncQueue.add("sincronizar-sarh", job, {
    jobId: `sarh-sync-${job.escopoSincronizacao?.global ? "global" : "orgao"}-${Date.now()}`,
  });
}
