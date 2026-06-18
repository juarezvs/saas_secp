import { listarApuracoesDoServidorNoMes } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type FrequenciaMesServidorResumo = {
  mes: string;
  diasUteis: number;
  regular: number;
  pendente: number;
  falta: number;
  recesso: number;
  aguardando: number;
};

function competenciaAtualManaus() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    ano: Number(partes.find((parte) => parte.type === "year")?.value),
    mes: Number(partes.find((parte) => parte.type === "month")?.value),
  };
}

function formatarCompetencia(ano: number, mes: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
}

function ehDiaUtil(item: {
  cargaPrevistaMinutos: number;
  resultado: string;
  metadados?: unknown;
}) {
  if (item.cargaPrevistaMinutos > 0) {
    return true;
  }

  if (!item.metadados || typeof item.metadados !== "object") {
    return false;
  }

  const metadados = item.metadados as Record<string, unknown>;
  return metadados.contaComoDiaUtil === true;
}

function ehRegular(item: { resultado: string; status: string }) {
  return (
    ["REGULAR", "CREDITO"].includes(item.resultado) &&
    ["HOMOLOGADA", "FECHADA"].includes(item.status)
  );
}

function ehAguardandoHomologacao(item: { resultado: string; status: string }) {
  return (
    ["REGULAR", "CREDITO"].includes(item.resultado) &&
    !["HOMOLOGADA", "FECHADA"].includes(item.status)
  );
}

function ehPendente(item: { resultado: string; status: string }) {
  return (
    ["PENDENTE", "INCOMPLETA", "DEBITO"].includes(item.resultado) ||
    ["PENDENTE", "INCONSISTENTE"].includes(item.status)
  );
}

export async function buscarFrequenciaMesServidorPorUsuarioId(
  usuarioId: string,
): Promise<FrequenciaMesServidorResumo | null> {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    select: {
      id: true,
    },
  });

  if (!servidor) {
    return null;
  }

  const competencia = competenciaAtualManaus();
  const itens = await listarApuracoesDoServidorNoMes({
    servidorId: servidor.id,
    ano: competencia.ano,
    mes: competencia.mes,
  });

  const resumo: FrequenciaMesServidorResumo = {
    mes: formatarCompetencia(competencia.ano, competencia.mes),
    diasUteis: 0,
    regular: 0,
    pendente: 0,
    falta: 0,
    recesso: 0,
    aguardando: 0,
  };

  for (const item of itens) {
    if (!ehDiaUtil(item)) {
      resumo.recesso += 1;
      continue;
    }

    resumo.diasUteis += 1;

    if (item.resultado === "FALTA") {
      resumo.falta += 1;
    } else if (ehRegular(item)) {
      resumo.regular += 1;
    } else if (ehAguardandoHomologacao(item)) {
      resumo.aguardando += 1;
    } else if (ehPendente(item)) {
      resumo.pendente += 1;
    } else {
      resumo.pendente += 1;
    }
  }

  return resumo;
}
