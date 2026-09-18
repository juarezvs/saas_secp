import { prisma } from "@/shared/infrastructure/database/prisma";

export async function obterProcessamentoEspelhoPonto(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  return prisma.processamentoEspelhoPonto.findUnique({
    where: {
      servidorId_anoReferencia_mesReferencia: params,
    },
  });
}

export async function registrarCompetenciaEspelhoAtualizada(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  motivo: string;
  solicitadoPorId?: string | null;
}) {
  const agora = new Date();

  return prisma.processamentoEspelhoPonto.upsert({
    where: {
      servidorId_anoReferencia_mesReferencia: {
        servidorId: params.servidorId,
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
      },
    },
    create: {
      ...params,
      solicitadoPorId: params.solicitadoPorId ?? null,
      status: "ATUALIZADO",
      solicitadoEm: agora,
      iniciadoEm: agora,
      concluidoEm: agora,
    },
    update: {
      status: "ATUALIZADO",
      motivo: params.motivo,
      solicitadoPorId: params.solicitadoPorId ?? null,
      concluidoEm: agora,
      erro: null,
    },
  });
}

export function processamentoAtualizadoHoje(
  processamento: { status: string; concluidoEm: Date | null } | null,
  fusoHorario: string,
  agora = new Date(),
) {
  if (processamento?.status !== "ATUALIZADO" || !processamento.concluidoEm) {
    return false;
  }

  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatador.format(processamento.concluidoEm) === formatador.format(agora);
}
