import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma, TipoSolicitacao } from "@/generated/prisma/client";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";

type FiltrosSolicitacao = {
  servidor?: string;
  tipo?: string;
  competencia?: string;
  orgaoIdsPermitidos?: string[];
};

type PaginacaoSolicitacaoParams = {
  pagina?: number;
  itensPorPagina?: number;
};

const includeSolicitacaoListagem = {
  servidor: {
    include: {
      usuario: true,
    },
  },
  unidade: true,
  analisadaPor: true,
} satisfies Prisma.SolicitacaoInclude;

function whereSolicitacoesDoUsuario(usuarioId: string) {
  return {
    usuarioSolicitanteId: usuarioId,
  } satisfies Prisma.SolicitacaoWhereInput;
}

function whereSolicitacoesParaUnidadesChefia(params: {
  usuarioId: string;
  unidadeIds: string[];
}) {
  const filtrosUnidades: Prisma.SolicitacaoWhereInput[] =
    params.unidadeIds.length > 0
      ? [
          {
            unidadeId: {
              in: params.unidadeIds,
            },
          },
          {
            servidor: {
              lotacoes: {
                some: {
                  status: "ATIVO",
                  unidadeId: {
                    in: params.unidadeIds,
                  },
                },
              },
            },
          },
        ]
      : [];

  return {
    OR: [
      {
        chefiaResponsavel: {
          servidor: {
            usuarioId: params.usuarioId,
          },
        },
      },
      {
        unidade: {
          gestores: {
            some: {
              servidor: {
                usuarioId: params.usuarioId,
              },
              ativo: true,
              dataFim: null,
              papel: {
                in: ["GESTOR_TITULAR", "GESTOR_SUBSTITUTO", "DELEGADO_CHEFIA"],
              },
            },
          },
        },
      },
      ...filtrosUnidades,
    ],
  } satisfies Prisma.SolicitacaoWhereInput;
}

async function whereSolicitacoesParaChefia(usuarioId: string) {
  const unidadeIds = await listarIdsUnidadesSubordinadasPorUsuario(usuarioId);

  return whereSolicitacoesParaUnidadesChefia({
    usuarioId,
    unidadeIds,
  });
}

function filtroServidorSolicitacao(
  servidor?: string,
): Prisma.SolicitacaoWhereInput | undefined {
  const termo = servidor?.trim();

  if (!termo) {
    return undefined;
  }

  const termos = Array.from(
    new Set(
      [termo, ...termo.split(" - "), ...termo.split("-")]
        .map((parte) => parte.trim())
        .filter(Boolean),
    ),
  );

  return {
    OR: termos.map((parte) => ({
      servidor: {
        OR: [
          {
            matricula: {
              contains: parte,
              mode: "insensitive",
            },
          },
          {
            nomeFuncional: {
              contains: parte,
              mode: "insensitive",
            },
          },
          {
            usuario: {
              nome: {
                contains: parte,
                mode: "insensitive",
              },
            },
          },
        ],
      },
    })),
  };
}

function filtroTipoSolicitacao(
  tipo?: string,
): Prisma.SolicitacaoWhereInput | undefined {
  const valor = tipo?.trim();

  if (!valor) {
    return undefined;
  }

  return {
    tipo: valor as TipoSolicitacao,
  };
}

function filtroCompetenciaSolicitacao(
  competencia?: string,
): Prisma.SolicitacaoWhereInput | undefined {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  if (!Number.isInteger(ano) || mes < 1 || mes > 12) {
    return undefined;
  }

  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));

  return {
    OR: [
      {
        dataReferencia: {
          gte: inicio,
          lt: fim,
        },
      },
      {
        dataReferencia: null,
        dataInicio: {
          lt: fim,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: inicio,
            },
          },
        ],
      },
    ],
  };
}

function filtroOrgaoSolicitacao(
  orgaoIdsPermitidos?: string[],
): Prisma.SolicitacaoWhereInput | undefined {
  if (!orgaoIdsPermitidos) {
    return undefined;
  }

  if (orgaoIdsPermitidos.length === 0) {
    return {
      servidorId: "00000000-0000-4000-8000-000000000000",
    };
  }

  return {
    servidor: {
      orgaoId: {
        in: orgaoIdsPermitidos,
      },
    },
  };
}

function aplicarFiltrosSolicitacao(
  where: Prisma.SolicitacaoWhereInput,
  filtros?: FiltrosSolicitacao,
): Prisma.SolicitacaoWhereInput {
  const filtroServidor = filtroServidorSolicitacao(filtros?.servidor);
  const filtroTipo = filtroTipoSolicitacao(filtros?.tipo);
  const filtroCompetencia = filtroCompetenciaSolicitacao(filtros?.competencia);
  const filtroOrgao = filtroOrgaoSolicitacao(filtros?.orgaoIdsPermitidos);
  const filtrosAtivos = [
    filtroServidor,
    filtroTipo,
    filtroCompetencia,
    filtroOrgao,
  ].filter((filtro): filtro is Prisma.SolicitacaoWhereInput => Boolean(filtro));

  if (filtrosAtivos.length === 0) {
    return where;
  }

  return {
    AND: [where, ...filtrosAtivos],
  };
}

async function listarSolicitacoesPaginadas(
  where: Prisma.SolicitacaoWhereInput,
  filtros?: FiltrosSolicitacao,
  paginacao?: PaginacaoSolicitacaoParams,
) {
  const pagina = Math.max(Number(paginacao?.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(paginacao?.itensPorPagina ?? 10), 5),
    100,
  );
  const whereFinal = aplicarFiltrosSolicitacao(where, filtros);

  const [total, solicitacoes] = await Promise.all([
    prisma.solicitacao.count({ where: whereFinal }),
    prisma.solicitacao.findMany({
      where: whereFinal,
      include: includeSolicitacaoListagem,
      orderBy: {
        criadoEm: "desc",
      },
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    solicitacoes,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function buscarServidorSolicitantePorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          unidade: {
            include: {
              orgao: {
                select: {
                  fusoHorario: true,
                },
              },
              unidadePai: {
                include: {
                  orgao: {
                    select: {
                      fusoHorario: true,
                    },
                  },
                  unidadePai: {
                    include: {
                      orgao: {
                        select: {
                          fusoHorario: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });
}

export async function listarSolicitacoesDoUsuario(
  usuarioId: string,
  filtros?: FiltrosSolicitacao,
) {
  return prisma.solicitacao.findMany({
    where: aplicarFiltrosSolicitacao(
      whereSolicitacoesDoUsuario(usuarioId),
      filtros,
    ),
    include: includeSolicitacaoListagem,
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarSolicitacoesDoUsuarioPaginado(
  usuarioId: string,
  filtros?: FiltrosSolicitacao,
  paginacao?: PaginacaoSolicitacaoParams,
) {
  return listarSolicitacoesPaginadas(
    whereSolicitacoesDoUsuario(usuarioId),
    filtros,
    paginacao,
  );
}

export async function listarSolicitacoesParaChefia(
  usuarioId: string,
  filtros?: FiltrosSolicitacao,
) {
  const whereChefia = await whereSolicitacoesParaChefia(usuarioId);

  return prisma.solicitacao.findMany({
    where: aplicarFiltrosSolicitacao(whereChefia, filtros),
    include: includeSolicitacaoListagem,
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarSolicitacoesParaChefiaPaginado(
  usuarioId: string,
  filtros?: FiltrosSolicitacao,
  paginacao?: PaginacaoSolicitacaoParams,
) {
  const whereChefia = await whereSolicitacoesParaChefia(usuarioId);

  return listarSolicitacoesPaginadas(whereChefia, filtros, paginacao);
}

export async function listarSolicitacoesGlobais(filtros?: FiltrosSolicitacao) {
  return prisma.solicitacao.findMany({
    where: aplicarFiltrosSolicitacao({}, filtros),
    include: includeSolicitacaoListagem,
    orderBy: {
      criadoEm: "desc",
    },
    take: 100,
  });
}

export async function listarSolicitacoesGlobaisPaginado(
  filtros?: FiltrosSolicitacao,
  paginacao?: PaginacaoSolicitacaoParams,
) {
  return listarSolicitacoesPaginadas({}, filtros, paginacao);
}

async function listarServidoresParaFiltroSolicitacoes(
  where: Prisma.SolicitacaoWhereInput,
  filtros?: Pick<FiltrosSolicitacao, "competencia" | "orgaoIdsPermitidos">,
) {
  const whereFinal = aplicarFiltrosSolicitacao(where, filtros);
  const solicitacoes = await prisma.solicitacao.findMany({
    where: whereFinal,
    select: {
      servidor: {
        select: {
          id: true,
          matricula: true,
          nomeFuncional: true,
          usuario: {
            select: {
              nome: true,
            },
          },
        },
      },
    },
    distinct: ["servidorId"],
    orderBy: {
      criadoEm: "desc",
    },
    take: 500,
  });

  return solicitacoes
    .map((solicitacao) => solicitacao.servidor)
    .sort((a, b) =>
      (a.nomeFuncional ?? a.usuario.nome).localeCompare(
        b.nomeFuncional ?? b.usuario.nome,
        "pt-BR",
      ),
    );
}

export async function listarServidoresFiltroSolicitacoesDoUsuario(
  usuarioId: string,
  filtros?: Pick<FiltrosSolicitacao, "competencia">,
) {
  return listarServidoresParaFiltroSolicitacoes(
    whereSolicitacoesDoUsuario(usuarioId),
    filtros,
  );
}

export async function listarServidoresFiltroSolicitacoesParaChefia(
  usuarioId: string,
  filtros?: Pick<FiltrosSolicitacao, "competencia">,
) {
  const whereChefia = await whereSolicitacoesParaChefia(usuarioId);

  return listarServidoresParaFiltroSolicitacoes(whereChefia, filtros);
}

export async function listarServidoresFiltroSolicitacoesGlobais(
  filtros?: Pick<FiltrosSolicitacao, "competencia" | "orgaoIdsPermitidos">,
) {
  return listarServidoresParaFiltroSolicitacoes({}, filtros);
}

export async function buscarSolicitacaoPorId(id: string) {
  return prisma.solicitacao.findUnique({
    where: {
      id,
    },
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
      usuarioSolicitante: true,
      unidade: true,
      chefiaResponsavel: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      analisadaPor: true,
      autorizacaoBancoHoras: {
        include: {
          autorizadoPor: true,
        },
      },
      eventos: {
        include: {
          usuario: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      },
    },
  });
}

export async function usuarioPodeAcessarSolicitacaoComoChefia(params: {
  usuarioId: string;
  solicitacaoId: string;
}) {
  const whereChefia = await whereSolicitacoesParaChefia(params.usuarioId);

  const solicitacao = await prisma.solicitacao.findFirst({
    where: {
      AND: [
        {
          id: params.solicitacaoId,
        },
        whereChefia,
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(solicitacao);
}
