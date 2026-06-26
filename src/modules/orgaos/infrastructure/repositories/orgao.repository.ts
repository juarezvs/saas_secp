import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarOrgaosParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  sigla?: string;
  nome?: string;
  codigoExternoSarh?: string;
  status?: string;
  fusoHorario?: string;
};

export function montarWhereOrgaos(params: ListarOrgaosParams = {}) {
  const busca = params.busca?.trim();
  const codigoExternoSarh = Number(params.codigoExternoSarh);

  return {
    ...(params.status === "ativo"
      ? { ativo: true }
      : params.status === "inativo"
        ? { ativo: false }
        : {}),

    ...(params.fusoHorario ? { fusoHorario: params.fusoHorario } : {}),

    ...(params.sigla
      ? {
          sigla: {
            contains: params.sigla,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(params.nome
      ? {
          nome: {
            contains: params.nome,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(Number.isInteger(codigoExternoSarh) && codigoExternoSarh > 0
      ? { codigoExternoSarh }
      : {}),

    ...(busca
      ? {
          OR: [
            { sigla: { contains: busca, mode: "insensitive" as const } },
            { nome: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const includeOrgaoListagem = {
  _count: {
    select: {
      unidades: true,
      servidores: true,
    },
  },
};

export async function listarOrgaosAtivos() {
  return prisma.orgao.findMany({
    where: {
      ativo: true,
    },

    orderBy: [
      {
        sigla: "asc",
      },
    ],

    select: {
      id: true,
      sigla: true,
      nome: true,
    },
  });
}

export async function listarOrgaos() {
  return prisma.orgao.findMany({
    orderBy: [
      {
        sigla: "asc",
      },
    ],

    select: {
      id: true,
      sigla: true,
      nome: true,
      ativo: true,
    },
  });
}

export async function listarOrgaosPaginado(params: ListarOrgaosParams) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereOrgaos(params);

  const [total, orgaos] = await Promise.all([
    prisma.orgao.count({ where }),
    prisma.orgao.findMany({
      where,
      include: includeOrgaoListagem,
      orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    orgaos,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarOrgaosParaExportacao(params: ListarOrgaosParams) {
  return prisma.orgao.findMany({
    where: montarWhereOrgaos(params),
    include: includeOrgaoListagem,
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });
}

export async function buscarOrgaoPorId(id: string) {
  return prisma.orgao.findUnique({
    where: {
      id,
    },
  });
}

export async function existeOrgaoComSigla(sigla: string, ignorarId?: string) {
  const orgao = await prisma.orgao.findFirst({
    where: {
      sigla,

      ...(ignorarId
        ? {
            id: {
              not: ignorarId,
            },
          }
        : {}),
    },

    select: {
      id: true,
    },
  });

  return Boolean(orgao);
}
