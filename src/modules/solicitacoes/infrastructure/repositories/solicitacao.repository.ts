import { prisma } from "@/shared/infrastructure/database/prisma";

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
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });
}

export async function listarSolicitacoesDoUsuario(usuarioId: string) {
  return prisma.solicitacao.findMany({
    where: {
      usuarioSolicitanteId: usuarioId,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
      unidade: true,
      analisadaPor: true,
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarSolicitacoesParaChefia(usuarioId: string) {
  return prisma.solicitacao.findMany({
    where: {
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
                  in: ["GESTOR_TITULAR", "GESTOR_SUBSTITUTO", "DELEGADO_CHEFIA"],
                },
              },
            },
          },
        },
      ],
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
      unidade: true,
      analisadaPor: true,
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarSolicitacoesGlobais() {
  return prisma.solicitacao.findMany({
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
      unidade: true,
      analisadaPor: true,
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: 100,
  });
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