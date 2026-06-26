import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

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

function whereSolicitacoesParaChefia(usuarioId: string) {
  return {
    OR: [
      {
        chefiaResponsavel: {
          servidor: {
            usuarioId,
          },
        },
      },
      {
        unidade: {
          gestores: {
            some: {
              servidor: {
                usuarioId,
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
    ],
  } satisfies Prisma.SolicitacaoWhereInput;
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
  return prisma.solicitacao.findMany({
    where: aplicarFiltrosSolicitacao(whereSolicitacoesParaChefia(usuarioId), filtros),
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
  return listarServidoresParaFiltroSolicitacoes(
    whereSolicitacoesParaChefia(usuarioId),
  );
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
