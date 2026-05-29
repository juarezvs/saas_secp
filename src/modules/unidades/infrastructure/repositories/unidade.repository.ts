import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarUnidadesParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  sigla?: string;
  nome?: string;
  tipo?: string;
  orgaoId?: string;
  superior?: string;
  status?: string;
};

export function montarWhereUnidades(params: ListarUnidadesParams) {
  const busca = params.busca?.trim();

  return {
    ...(params.status === "ativa"
      ? { ativo: true }
      : params.status === "inativa"
        ? { ativo: false }
        : {}),

    ...(params.sigla
      ? { sigla: { contains: params.sigla, mode: "insensitive" as const } }
      : {}),

    ...(params.nome
      ? { nome: { contains: params.nome, mode: "insensitive" as const } }
      : {}),

    ...(params.tipo ? { tipo: params.tipo as never } : {}),

    ...(params.orgaoId ? { orgaoId: params.orgaoId } : {}),

    ...(params.superior
      ? {
          unidadePai: {
            sigla: { contains: params.superior, mode: "insensitive" as const },
          },
        }
      : {}),

    ...(busca
      ? {
          OR: [
            { sigla: { contains: busca, mode: "insensitive" as const } },
            { nome: { contains: busca, mode: "insensitive" as const } },
            { codigo: { contains: busca, mode: "insensitive" as const } },
            {
              orgao: {
                sigla: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              unidadePai: {
                sigla: { contains: busca, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

export async function listarUnidadesOrganizacionaisPaginado(
  params: ListarUnidadesParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );

  const where = montarWhereUnidades(params);

  const [total, unidades] = await Promise.all([
    prisma.unidadeOrganizacional.count({ where }),

    prisma.unidadeOrganizacional.findMany({
      where,
      include: {
        orgao: true,
        unidadePai: true,
        _count: {
          select: {
            unidadesFilhas: true,
            lotacoes: true,
          },
        },
      },
      orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    unidades,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarUnidadesOrganizacionaisParaExportacao(
  params: ListarUnidadesParams,
) {
  return prisma.unidadeOrganizacional.findMany({
    where: montarWhereUnidades(params),
    include: {
      orgao: true,
      unidadePai: true,
      _count: {
        select: {
          unidadesFilhas: true,
          lotacoes: true,
        },
      },
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });
}
export async function buscarUnidadePorId(id: string) {
  return prisma.unidadeOrganizacional.findUnique({
    where: {
      id,
    },
    include: {
      orgao: true,
      unidadePai: true,
      unidadesFilhas: {
        orderBy: [
          {
            sigla: "asc",
          },
          {
            nome: "asc",
          },
        ],
      },
      lotacoes: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      gestores: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      _count: {
        select: {
          unidadesFilhas: true,
          lotacoes: true,
          gestores: true,
        },
      },
    },
  });
}
