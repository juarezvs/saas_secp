import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";

type FiltrosSolicitacao = {
  servidor?: string;
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
                in: [
                  "GESTOR_TITULAR",
                  "GESTOR_SUBSTITUTO",
                  "DELEGADO_CHEFIA",
                ],
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

function aplicarFiltrosSolicitacao(
  where: Prisma.SolicitacaoWhereInput,
  filtros?: FiltrosSolicitacao,
): Prisma.SolicitacaoWhereInput {
  const filtroServidor = filtroServidorSolicitacao(filtros?.servidor);

  if (!filtroServidor) {
    return where;
  }

  return {
    AND: [where, filtroServidor],
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
    where: aplicarFiltrosSolicitacao(whereSolicitacoesDoUsuario(usuarioId), filtros),
    include: includeSolicitacaoListagem,
    orderBy: {
      criadoEm: "desc",
    },
  });
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

async function listarServidoresParaFiltroSolicitacoes(
  where: Prisma.SolicitacaoWhereInput,
) {
  const solicitacoes = await prisma.solicitacao.findMany({
    where,
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
) {
  return listarServidoresParaFiltroSolicitacoes(
    whereSolicitacoesDoUsuario(usuarioId),
  );
}

export async function listarServidoresFiltroSolicitacoesParaChefia(
  usuarioId: string,
) {
  const whereChefia = await whereSolicitacoesParaChefia(usuarioId);

  return listarServidoresParaFiltroSolicitacoes(whereChefia);
}

export async function listarServidoresFiltroSolicitacoesGlobais() {
  return listarServidoresParaFiltroSolicitacoes({});
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
