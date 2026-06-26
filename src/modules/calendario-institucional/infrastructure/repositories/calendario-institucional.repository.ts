import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";

export type ListarCalendarioInstitucionalParams = {
  busca?: string;
  tipo?: string;
  abrangencia?: string;
  status?: string;
  ano?: string;
  mes?: string;
  pagina?: number;
  itensPorPagina?: number;
};

function ehTipoCalendarioInstitucional(valor?: string | null) {
  return ["FERIADO", "PONTO_FACULTATIVO", "SUSPENSAO_EXPEDIENTE"].includes(
    valor ?? "",
  );
}

function ehAbrangenciaCalendarioInstitucional(valor?: string | null) {
  return ["NACIONAL", "ESTADUAL", "MUNICIPAL", "ORGAO", "UNIDADE"].includes(
    valor ?? "",
  );
}

function montarPeriodoFiltro(params: { ano?: string; mes?: string }) {
  const ano = Number(params.ano ?? 0);
  const mes = Number(params.mes ?? 0);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return null;
  }

  if (Number.isInteger(mes) && mes >= 1 && mes <= 12) {
    return {
      gte: new Date(Date.UTC(ano, mes - 1, 1)),
      lt: new Date(Date.UTC(ano, mes, 1)),
    };
  }

  return {
    gte: new Date(Date.UTC(ano, 0, 1)),
    lt: new Date(Date.UTC(ano + 1, 0, 1)),
  };
}

export function montarWhereCalendarioInstitucional(
  params: ListarCalendarioInstitucionalParams,
) {
  const busca = params.busca?.trim();
  const tipo = params.tipo?.trim();
  const abrangencia = params.abrangencia?.trim();
  const periodo = montarPeriodoFiltro({
    ano: params.ano,
    mes: params.mes,
  });

  return {
    ...(params.status === "ativo"
      ? { ativo: true }
      : params.status === "inativo"
        ? { ativo: false }
        : {}),
    ...(tipo && ehTipoCalendarioInstitucional(tipo)
      ? { tipo: tipo as never }
      : {}),
    ...(abrangencia && ehAbrangenciaCalendarioInstitucional(abrangencia)
      ? { abrangencia: abrangencia as never }
      : {}),
    ...(periodo
      ? {
          dataReferencia: periodo,
        }
      : {}),
    ...(busca
      ? {
          OR: [
            { descricao: { contains: busca, mode: "insensitive" as const } },
            { observacao: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listarCalendarioInstitucionalPaginado(
  params: ListarCalendarioInstitucionalParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereCalendarioInstitucional(params);

  const [total, eventos] = await Promise.all([
    prisma.calendarioInstitucional.count({ where }),
    prisma.calendarioInstitucional.findMany({
      where,
      orderBy: [{ dataReferencia: "desc" }, { descricao: "asc" }],
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    eventos,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarEventosCalendarioInstitucionalNoPeriodo(
  inicio: Date,
  fimExclusivo: Date,
) {
  return prisma.calendarioInstitucional.findMany({
    where: {
      ativo: true,
      dataReferencia: {
        gte: normalizarDataReferencia(inicio),
        lt: normalizarDataReferencia(fimExclusivo),
      },
    },
    orderBy: [{ dataReferencia: "asc" }, { descricao: "asc" }],
  });
}

export async function buscarEventoCalendarioInstitucionalPorId(id: string) {
  return prisma.calendarioInstitucional.findUnique({
    where: { id },
  });
}

export async function buscarEventoCalendarioInstitucionalPorData(
  dataReferencia: Date,
) {
  return prisma.calendarioInstitucional.findFirst({
    where: {
      dataReferencia: normalizarDataReferencia(dataReferencia),
      abrangencia: "NACIONAL",
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function buscarConflitoEventoCalendarioInstitucional(params: {
  dataReferencia: Date;
  abrangencia: string;
  uf?: string | null;
  municipio?: string | null;
  municipioIbge?: string | null;
  orgaoId?: string | null;
  unidadeId?: string | null;
  ignorarId?: string | null;
}) {
  return prisma.calendarioInstitucional.findFirst({
    where: {
      dataReferencia: normalizarDataReferencia(params.dataReferencia),
      abrangencia: params.abrangencia as never,
      uf: params.uf || null,
      municipio: params.municipio || null,
      municipioIbge: params.municipioIbge || null,
      orgaoId: params.orgaoId || null,
      unidadeId: params.unidadeId || null,
      ...(params.ignorarId ? { id: { not: params.ignorarId } } : {}),
    },
  });
}
