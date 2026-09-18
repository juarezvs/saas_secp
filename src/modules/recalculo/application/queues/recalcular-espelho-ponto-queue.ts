import { Queue } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";

export const RECALCULAR_ESPELHO_PONTO_QUEUE_NAME =
  "recalcular-espelho-ponto";

export type RecalcularEspelhoPontoJob = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  motivo: string;
  solicitadoPorId?: string | null;
};

export const recalcularEspelhoPontoConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
};

let queue: Queue<RecalcularEspelhoPontoJob> | null = null;

export function obterRecalcularEspelhoPontoQueue() {
  queue ??= new Queue<RecalcularEspelhoPontoJob>(
    RECALCULAR_ESPELHO_PONTO_QUEUE_NAME,
    {
      connection: recalcularEspelhoPontoConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24 * 2, count: 5000 },
        removeOnFail: { age: 60 * 60 * 24 * 7, count: 5000 },
      },
    },
  );

  return queue;
}

function competenciaValida(anoReferencia: number, mesReferencia: number) {
  return (
    Number.isInteger(anoReferencia) &&
    anoReferencia >= 2000 &&
    anoReferencia <= 2200 &&
    Number.isInteger(mesReferencia) &&
    mesReferencia >= 1 &&
    mesReferencia <= 12
  );
}

export async function enfileirarRecalculoEspelhoPonto(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  motivo: string;
  solicitadoPorId?: string | null;
  forcar?: boolean;
  fusoHorario?: string;
}) {
  if (!competenciaValida(params.anoReferencia, params.mesReferencia)) {
    throw new Error("Competencia invalida para recalculo do espelho.");
  }

  const fila = obterRecalcularEspelhoPontoQueue();
  const competencia = `${params.anoReferencia}-${String(params.mesReferencia).padStart(2, "0")}`;
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: params.fusoHorario ?? "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const jobId = params.forcar
    ? `espelho-${params.servidorId}-${competencia}-${Date.now()}`
    : `espelho-${params.servidorId}-${competencia}-${dia}`;
  const existente = await fila.getJob(jobId);

  if (existente && !params.forcar) {
    return existente;
  }

  await prisma.processamentoEspelhoPonto.upsert({
    where: {
      servidorId_anoReferencia_mesReferencia: {
        servidorId: params.servidorId,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
      },
    },
    create: {
      servidorId: params.servidorId,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      status: "PENDENTE",
      motivo: params.motivo,
      jobId,
      solicitadoPorId: params.solicitadoPorId ?? null,
    },
    update: {
      status: "PENDENTE",
      motivo: params.motivo,
      jobId,
      solicitadoPorId: params.solicitadoPorId ?? null,
      solicitadoEm: new Date(),
      iniciadoEm: null,
      concluidoEm: null,
      erro: null,
    },
  });

  try {
    return await fila.add(
      "recalcular-competencia-servidor",
      {
        servidorId: params.servidorId,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        motivo: params.motivo,
        solicitadoPorId: params.solicitadoPorId ?? null,
      },
      { jobId },
    );
  } catch (error) {
    await prisma.processamentoEspelhoPonto.updateMany({
      where: {
        servidorId: params.servidorId,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
        jobId,
      },
      data: {
        status: "FALHA",
        concluidoEm: new Date(),
        erro: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function enfileirarRecalculoEspelhoNoLogin(params: {
  usuarioId: string;
}) {
  const servidor = await prisma.servidor.findUnique({
    where: { usuarioId: params.usuarioId },
    select: { id: true },
  });

  if (!servidor) return null;

  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(agora);
  const anoReferencia = Number(partes.find((item) => item.type === "year")?.value);
  const mesReferencia = Number(partes.find((item) => item.type === "month")?.value);
  return enfileirarRecalculoEspelhoPonto({
    servidorId: servidor.id,
    anoReferencia,
    mesReferencia,
    motivo: "LOGIN_SERVIDOR",
    solicitadoPorId: params.usuarioId,
    fusoHorario: "America/Manaus",
  });
}
