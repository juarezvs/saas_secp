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

export type OrgaoSelecaoItem = {
  id: string;
  value: string;
  label: string;
  sigla: string;
  nome: string;
};

export type UnidadeSelecaoItem = {
  id: string;
  value: string;
  label: string;
  codigo: string;
  sigla: string;
  nome: string;
  tipo: string;
  orgaoId: string;
  unidadePaiId: string | null;
};

function ehUuid(valor?: string | null): valor is string {
  if (!valor) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export function montarWhereUnidades(params: ListarUnidadesParams) {
  const busca = params.busca?.trim();
  const orgaoId = params.orgaoId?.trim();

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

    ...(orgaoId && ehUuid(orgaoId) ? { orgaoId } : {}),

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
            {
              orgao: {
                sigla: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              orgao: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              unidadePai: {
                sigla: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              unidadePai: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
            ...(ehUuid(busca) ? [{ codigo: { equals: busca } }] : []),
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

export async function listarOrgaosAtivos(): Promise<OrgaoSelecaoItem[]> {
  const orgaos = await prisma.orgao.findMany({
    where: {
      ativo: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      sigla: true,
      nome: true,
    },
  });

  return orgaos.map((orgao) => {
    const sigla = orgao.sigla ?? "";

    return {
      id: orgao.id,
      value: orgao.id,
      label: sigla ? `${sigla} - ${orgao.nome}` : orgao.nome,
      sigla,
      nome: orgao.nome,
    };
  });
}

export async function listarUnidadesParaSelecao() {
  const unidades = await prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
      codigo: true,
      sigla: true,
      nome: true,
      tipo: true,
      orgaoId: true,
      unidadePaiId: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });

  return unidades.map((unidade) => {
    const sigla = unidade.sigla ?? "";
    const codigo = unidade.codigo ?? sigla ?? unidade.id;

    return {
      id: unidade.id,
      value: unidade.id,
      label: sigla ? `${sigla} - ${unidade.nome}` : unidade.nome,
      codigo,
      sigla,
      nome: unidade.nome,
      tipo: unidade.tipo,
      orgaoId: unidade.orgaoId,
      unidadePaiId: unidade.unidadePaiId ?? null,
    };
  });
}

export async function listarUnidadesAtivas() {
  return listarUnidadesParaSelecao();
}

export async function buscarUnidadePorId(id: string) {
  if (!ehUuid(id)) {
    return null;
  }

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

export async function listarIdsDescendentesDaUnidade(
  unidadeId: string,
): Promise<string[]> {
  if (!ehUuid(unidadeId)) {
    return [];
  }

  const descendentes: string[] = [];
  let paisPendentes = [unidadeId];

  while (paisPendentes.length > 0) {
    const filhos = await prisma.unidadeOrganizacional.findMany({
      where: {
        unidadePaiId: {
          in: paisPendentes,
        },
      },
      select: {
        id: true,
      },
    });

    const idsFilhos = filhos.map((filho) => filho.id);

    if (idsFilhos.length === 0) {
      break;
    }

    descendentes.push(...idsFilhos);
    paisPendentes = idsFilhos;
  }

  return descendentes;
}

export async function codigoUnidadeExiste(
  codigo: string,
  siglaOuIgnorarId?: string,
  talvezIgnorarId?: string,
): Promise<boolean> {
  const valorCodigo = codigo?.trim();
  const valorSiglaOuIgnorarId = siglaOuIgnorarId?.trim();
  const ignorarId =
    talvezIgnorarId?.trim() ||
    (ehUuid(valorSiglaOuIgnorarId) ? valorSiglaOuIgnorarId : undefined);

  const valoresParaSigla = new Set<string>();

  if (valorCodigo && !ehUuid(valorCodigo)) {
    valoresParaSigla.add(valorCodigo);
  }

  if (valorSiglaOuIgnorarId && !ehUuid(valorSiglaOuIgnorarId)) {
    valoresParaSigla.add(valorSiglaOuIgnorarId);
  }

  const filtros: Array<Record<string, unknown>> = [
    ...Array.from(valoresParaSigla).map((valor) => ({
      sigla: {
        equals: valor,
        mode: "insensitive" as const,
      },
    })),
    ...(ehUuid(valorCodigo)
      ? [
          {
            codigo: {
              equals: valorCodigo,
            },
          },
        ]
      : []),
  ];

  if (filtros.length === 0) {
    return false;
  }

  const registro = await prisma.unidadeOrganizacional.findFirst({
    where: {
      ...(ehUuid(ignorarId)
        ? {
            id: {
              not: ignorarId,
            },
          }
        : {}),
      OR: filtros as never,
    },
    select: {
      id: true,
    },
  });

  return Boolean(registro);
}
