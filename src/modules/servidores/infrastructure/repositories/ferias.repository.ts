import { prisma } from "@/shared/infrastructure/database/prisma";

function filtroFerias(servidorId: string) {
  return {
    servidorId,
    OR: [
      { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          OR: [
            { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
            { descricao: { contains: "FERIAS", mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };
}

function normalizarData(data: Date) {
  const normalizada = new Date(data);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}

function statusFerias(dataInicio: Date, dataFim: Date | null, ativo: boolean) {
  const hoje = normalizarData(new Date());
  const inicio = normalizarData(dataInicio);
  const fim = dataFim ? normalizarData(dataFim) : null;

  if (!ativo) return "INATIVA";
  if (inicio > hoje) return "PROGRAMADA";
  if (!fim || fim >= hoje) return "EM_GOZO";
  return "ENCERRADA";
}

function calcularDiasFerias(
  dias: number | null,
  dataInicio: Date,
  dataFim: Date | null,
) {
  if (typeof dias === "number" && Number.isFinite(dias) && dias > 0) {
    return dias;
  }

  if (!dataFim) {
    return 0;
  }

  const inicioUtc = Date.UTC(
    dataInicio.getUTCFullYear(),
    dataInicio.getUTCMonth(),
    dataInicio.getUTCDate(),
  );
  const fimUtc = Date.UTC(
    dataFim.getUTCFullYear(),
    dataFim.getUTCMonth(),
    dataFim.getUTCDate(),
  );
  const diasCalculados = Math.floor((fimUtc - inicioUtc) / 86400000) + 1;

  return diasCalculados > 0 ? diasCalculados : 0;
}

export async function listarPeriodosAquisitivosFerias(servidorId: string) {
  const registros = await prisma.afastamentoSarh.findMany({
    where: filtroFerias(servidorId),
    select: {
      exercicio: true,
      dataInicio: true,
      dataFim: true,
      dias: true,
      ativo: true,
    },
    orderBy: [{ exercicio: "desc" }, { dataInicio: "desc" }],
  });
  const agrupados = new Map<
    string,
    {
      exercicio: number | null;
      chave: string;
      label: string;
      totalPeriodos: number;
      diasProgramados: number;
      inicio: Date | null;
      fim: Date | null;
      status: "PROGRAMADA" | "EM_GOZO" | "ENCERRADA" | "INATIVA";
    }
  >();

  for (const registro of registros) {
    const chave = registro.exercicio
      ? String(registro.exercicio)
      : `sem-exercicio-${registro.dataInicio.getUTCFullYear()}`;
    const existente =
      agrupados.get(chave) ??
      {
        exercicio: registro.exercicio,
        chave,
        label: registro.exercicio
          ? `Exercício ${registro.exercicio}`
          : "Sem exercício informado",
        totalPeriodos: 0,
        diasProgramados: 0,
        inicio: null,
        fim: null,
        status: "ENCERRADA" as const,
      };
    const status = statusFerias(
      registro.dataInicio,
      registro.dataFim,
      registro.ativo,
    );

    existente.totalPeriodos += 1;
    existente.diasProgramados += calcularDiasFerias(
      registro.dias,
      registro.dataInicio,
      registro.dataFim,
    );
    existente.inicio =
      !existente.inicio || registro.dataInicio < existente.inicio
        ? registro.dataInicio
        : existente.inicio;
    existente.fim =
      registro.dataFim && (!existente.fim || registro.dataFim > existente.fim)
        ? registro.dataFim
        : existente.fim;
    if (status === "EM_GOZO") existente.status = "EM_GOZO";
    else if (status === "PROGRAMADA" && existente.status !== "EM_GOZO") {
      existente.status = "PROGRAMADA";
    } else if (
      status === "INATIVA" &&
      !["EM_GOZO", "PROGRAMADA"].includes(existente.status)
    ) {
      existente.status = "INATIVA";
    }

    agrupados.set(chave, existente);
  }

  return Array.from(agrupados.values()).sort((a, b) =>
    b.chave.localeCompare(a.chave),
  );
}

export async function listarFeriasPorPeriodoAquisitivo(params: {
  servidorId: string;
  exercicio?: number | null;
}) {
  const where = {
    ...filtroFerias(params.servidorId),
    ...(params.exercicio ? { exercicio: params.exercicio } : {}),
  };

  return prisma.afastamentoSarh.findMany({
    where,
    include: {
      tipoAfastamento: true,
    },
    orderBy: [{ dataInicio: "asc" }, { criadoEm: "asc" }],
  });
}
