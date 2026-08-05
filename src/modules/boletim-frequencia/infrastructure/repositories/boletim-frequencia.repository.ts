import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarBoletinsFrequenciaParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  anoReferencia?: string;
  mesReferencia?: string;
  unidade?: string;
  unidadeId?: string;
  unidadeIds?: string[];
  unidadeIdsPermitidos?: string[];
  status?: string;
};

function ehStatusBoletim(valor?: string | null) {
  return [
    "GERADO",
    "ENCAMINHADO_SECAP",
    "RECEBIDO_SECAP",
    "CONFERIDO",
    "CANCELADO",
  ].includes(valor ?? "");
}

export function montarWhereBoletinsFrequencia(
  params: ListarBoletinsFrequenciaParams = {},
) {
  const busca = params.busca?.trim();
  const anoReferencia = Number(params.anoReferencia);
  const mesReferencia = Number(params.mesReferencia);
  const unidadeIdsSelecionados = [
    ...(params.unidadeId ? [params.unidadeId] : []),
    ...(params.unidadeIds ?? []),
  ].filter(Boolean);
  const unidadeIdsPermitidos = params.unidadeIdsPermitidos?.filter(Boolean);
  const unidadeIdsSelecionadosPermitidos =
    unidadeIdsPermitidos && unidadeIdsPermitidos.length > 0
      ? unidadeIdsSelecionados.filter((id) => unidadeIdsPermitidos.includes(id))
      : unidadeIdsSelecionados;
  const unidadeIdsFiltrados =
    params.unidadeIdsPermitidos && unidadeIdsPermitidos?.length === 0
      ? ["__sem_unidades_permitidas__"]
      : unidadeIdsPermitidos && unidadeIdsPermitidos.length > 0
        ? unidadeIdsSelecionados.length > 0
          ? unidadeIdsSelecionadosPermitidos.length > 0
            ? unidadeIdsSelecionadosPermitidos
            : ["__sem_unidades_permitidas__"]
          : unidadeIdsPermitidos
        : unidadeIdsSelecionados;

  return {
    ...(Number.isInteger(anoReferencia) && anoReferencia > 0
      ? { anoReferencia }
      : {}),
    ...(Number.isInteger(mesReferencia) &&
    mesReferencia >= 1 &&
    mesReferencia <= 12
      ? { mesReferencia }
      : {}),
    ...(params.status && ehStatusBoletim(params.status)
      ? { status: params.status as never }
      : {}),
    ...(unidadeIdsFiltrados.length > 0
      ? {
          unidadeId: {
            in: unidadeIdsFiltrados,
          },
        }
      : {}),
    ...(params.unidade && unidadeIdsFiltrados.length === 0
      ? {
          unidade: {
            OR: [
              {
                sigla: {
                  contains: params.unidade,
                  mode: "insensitive" as const,
                },
              },
              {
                nome: {
                  contains: params.unidade,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        }
      : {}),
    ...(busca
      ? {
          OR: [
            { processoSei: { contains: busca, mode: "insensitive" as const } },
            {
              unidade: {
                OR: [
                  { sigla: { contains: busca, mode: "insensitive" as const } },
                  { nome: { contains: busca, mode: "insensitive" as const } },
                ],
              },
            },
            {
              geradoPor: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

const includeBoletimListagem = {
  unidade: true,
  fechamento: true,
  geradoPor: true,
  encaminhadoPor: true,
  recebidoPor: true,
  _count: {
    select: {
      servidores: true,
    },
  },
};

export async function listarBoletinsFrequencia() {
  return prisma.boletimFrequencia.findMany({
    orderBy: [
      {
        anoReferencia: "desc",
      },
      {
        mesReferencia: "desc",
      },
      {
        geradoEm: "desc",
      },
    ],
    include: includeBoletimListagem,
    take: 100,
  });
}

export async function listarBoletinsFrequenciaPaginado(
  params: ListarBoletinsFrequenciaParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereBoletinsFrequencia(params);

  const [total, boletins] = await Promise.all([
    prisma.boletimFrequencia.count({ where }),
    prisma.boletimFrequencia.findMany({
      where,
      orderBy: [
        { anoReferencia: "desc" },
        { mesReferencia: "desc" },
        { geradoEm: "desc" },
      ],
      include: includeBoletimListagem,
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    boletins,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarBoletinsFrequenciaParaExportacao(
  params: ListarBoletinsFrequenciaParams,
) {
  return prisma.boletimFrequencia.findMany({
    where: montarWhereBoletinsFrequencia(params),
    orderBy: [
      { anoReferencia: "desc" },
      { mesReferencia: "desc" },
      { geradoEm: "desc" },
    ],
    include: includeBoletimListagem,
  });
}

export async function buscarBoletimFrequenciaPorId(id: string) {
  return prisma.boletimFrequencia.findUnique({
    where: {
      id,
    },
    include: {
      unidade: true,
      fechamento: {
        include: {
          gestorResponsavel: {
            include: {
              servidor: {
                include: {
                  usuario: true,
                },
              },
            },
          },
        },
      },
      geradoPor: true,
      encaminhadoPor: true,
      recebidoPor: true,
      servidores: {
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                },
                include: {
                  unidade: true,
                },
                orderBy: {
                  dataInicio: "desc",
                },
              },
            },
          },
          homologacaoServidorMes: true,
        },
        orderBy: {
          servidor: {
            matricula: "asc",
          },
        },
      },
    },
  });
}

export async function listarHistoricoBoletimFrequencia(boletimId: string) {
  return prisma.auditoriaEvento.findMany({
    where: {
      entidade: "BoletimFrequencia",
      entidadeId: boletimId,
    },
    include: {
      usuario: true,
    },
    orderBy: {
      criadoEm: "asc",
    },
  });
}

export async function listarFechamentosHomologadosSemBoletim(params?: {
  unidadeIdsPermitidos?: string[];
}) {
  return prisma.fechamentoMensalUnidade.findMany({
    where: {
      status: "HOMOLOGADO",
      boletimFrequencia: null,
      ...(params?.unidadeIdsPermitidos
        ? {
            unidadeId: {
              in: params.unidadeIdsPermitidos,
            },
          }
        : {}),
    },
    include: {
      unidade: true,
      servidores: true,
    },
    orderBy: [
      {
        anoReferencia: "desc",
      },
      {
        mesReferencia: "desc",
      },
      {
        unidade: {
          sigla: "asc",
        },
      },
    ],
  });
}

export async function buscarFechamentoParaBoletim(fechamentoId: string) {
  return prisma.fechamentoMensalUnidade.findUnique({
    where: {
      id: fechamentoId,
    },
    include: {
      unidade: true,
      gestorResponsavel: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      servidores: {
        include: {
          servidor: {
            include: {
              usuario: true,
              bancoHorasSaldo: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                },
                include: {
                  unidade: true,
                },
                orderBy: {
                  dataInicio: "desc",
                },
              },
            },
          },
          homologadoPor: true,
        },
        orderBy: {
          servidor: {
            matricula: "asc",
          },
        },
      },
      boletimFrequencia: true,
    },
  });
}

export async function listarUnidadesBoletimFrequencia(params?: {
  unidadeIdsPermitidos?: string[];
}) {
  const unidadeIdsPermitidos = params?.unidadeIdsPermitidos?.filter(Boolean);

  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
      boletimFrequencias: {
        some: {},
      },
      ...(params?.unidadeIdsPermitidos && unidadeIdsPermitidos?.length === 0
        ? {
            id: {
              in: ["__sem_unidades_permitidas__"],
            },
          }
        : unidadeIdsPermitidos && unidadeIdsPermitidos.length > 0
          ? {
              id: {
                in: unidadeIdsPermitidos,
              },
            }
          : {}),
    },
    select: {
      id: true,
      sigla: true,
      nome: true,
      unidadePaiId: true,
      unidadePai: {
        select: {
          sigla: true,
          nome: true,
        },
      },
      orgao: {
        select: {
          sigla: true,
        },
      },
    },
    orderBy: [
      {
        orgao: {
          sigla: "asc",
        },
      },
      {
        unidadePai: {
          sigla: "asc",
        },
      },
      {
        sigla: "asc",
      },
    ],
  });
}

export async function listarBoletinsFrequenciaParaPdfAgrupado(
  params: ListarBoletinsFrequenciaParams,
) {
  return prisma.boletimFrequencia.findMany({
    where: montarWhereBoletinsFrequencia(params),
    orderBy: [
      { anoReferencia: "desc" },
      { mesReferencia: "desc" },
      {
        unidade: {
          sigla: "asc",
        },
      },
      { geradoEm: "desc" },
    ],
    include: {
      unidade: {
        include: {
          orgao: true,
        },
      },
      geradoPor: true,
      encaminhadoPor: true,
      recebidoPor: true,
      servidores: {
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                },
                include: {
                  unidade: {
                    select: {
                      sigla: true,
                    },
                  },
                },
                orderBy: {
                  dataInicio: "desc",
                },
              },
            },
          },
        },
        orderBy: {
          servidor: {
            matricula: "asc",
          },
        },
      },
    },
  });
}
