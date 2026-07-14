import {
  coletaRelogioProgressivaQueue,
  enfileirarColetaRelogioProgressiva,
  progressoColetaAgendada,
  type ColetaRelogioProgressivaJobData,
  type ColetaRelogioProgressivaModo,
  type ColetaRelogioProgressivaProgress,
} from "../queues/coleta-relogio-progressiva-queue";

export type { ColetaRelogioProgressivaModo };

export type ColetaRelogioProgressivaJob = {
  id: string;
  status: "AGUARDANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";
  modo: ColetaRelogioProgressivaModo;
  equipamentoId: string;
  criadoEm: string;
  atualizadoEm: string;
  progresso: ColetaRelogioProgressivaProgress;
  resultado?: unknown;
  erro?: string | null;
};

type IniciarColetaParams = ColetaRelogioProgressivaJobData;

function mapearStatusBullMq(estado: string): ColetaRelogioProgressivaJob["status"] {
  if (estado === "completed") return "CONCLUIDO";
  if (estado === "failed") return "ERRO";
  if (estado === "active") return "PROCESSANDO";
  return "AGUARDANDO";
}

async function serializarJobBullMq(
  jobId: string,
): Promise<ColetaRelogioProgressivaJob | null> {
  const job = await coletaRelogioProgressivaQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const estado = await job.getState();
  const progresso =
    typeof job.progress === "object" && job.progress
      ? (job.progress as ColetaRelogioProgressivaProgress)
      : progressoColetaAgendada(Number(job.data.limiteLotes ?? 100));

  return {
    id: job.id ?? jobId,
    status: mapearStatusBullMq(estado),
    modo: job.data.modo,
    equipamentoId: job.data.equipamentoId,
    criadoEm: new Date(job.timestamp).toISOString(),
    atualizadoEm: new Date(job.processedOn ?? job.finishedOn ?? job.timestamp).toISOString(),
    progresso,
    resultado: estado === "completed" ? job.returnvalue : undefined,
    erro: estado === "failed" ? job.failedReason : null,
  };
}

export async function iniciarColetaRelogioProgressiva(
  params: IniciarColetaParams,
) {
  const job = await enfileirarColetaRelogioProgressiva(params);
  return serializarJobBullMq(job.id ?? `coleta-relogio-${params.equipamentoId}`);
}

export async function obterColetaRelogioProgressiva(jobId: string) {
  return serializarJobBullMq(jobId);
}

export async function cancelarColetaRelogioProgressiva(jobId: string) {
  const job = await coletaRelogioProgressivaQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const estado = await job.getState();
  if (["waiting", "delayed", "paused"].includes(estado)) {
    await job.remove();
    return {
      id: job.id ?? jobId,
      status: "CANCELADO",
      modo: job.data.modo,
      equipamentoId: job.data.equipamentoId,
      criadoEm: new Date(job.timestamp).toISOString(),
      atualizadoEm: new Date().toISOString(),
      progresso: {
        ...progressoColetaAgendada(Number(job.data.limiteLotes ?? 100)),
        etapa: "Coleta cancelada antes do processamento.",
      },
      erro: null,
    } satisfies ColetaRelogioProgressivaJob;
  }

  return serializarJobBullMq(jobId);
}

export async function listarColetasRelogioProgressivasAtivas() {
  const jobs = await coletaRelogioProgressivaQueue.getJobs([
    "waiting",
    "active",
    "delayed",
    "paused",
  ]);

  const serializados = await Promise.all(
    jobs.map((job) => serializarJobBullMq(job.id ?? "")),
  );

  return serializados.filter(
    (job): job is ColetaRelogioProgressivaJob => job !== null,
  );
}
