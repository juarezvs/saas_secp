import { prisma } from "@/shared/infrastructure/database/prisma";

type EscopoServidoresRecesso = {
  servidorIdsPermitidos?: string[];
};

export async function listarRecessosForenses() {
  return prisma.recessoForense.findMany({
    orderBy: { ano: "desc" },
    include: {
      convocacoes: true,
      convocados: true,
      homologacoes: true,
    },
  });
}

export async function buscarRecessoForensePorId(
  id: string,
  params: EscopoServidoresRecesso = {},
) {
  const filtroServidores = params.servidorIdsPermitidos
    ? { servidorId: { in: params.servidorIdsPermitidos } }
    : {};
  const filtroConvocacoes = params.servidorIdsPermitidos
    ? {
        convocados: {
          some: {
            servidorId: {
              in: params.servidorIdsPermitidos,
            },
          },
        },
      }
    : {};

  return prisma.recessoForense.findUnique({
    where: { id },
    include: {
      criadoPor: true,
      fechadoPor: true,
      convocacoes: {
        where: filtroConvocacoes,
        orderBy: { criadoEm: "desc" },
        include: {
          unidade: true,
          chefiaResponsavel: {
            include: {
              usuario: true,
            },
          },
          convocados: {
            where: filtroServidores,
            include: {
              servidor: {
                include: {
                  usuario: true,
                  lotacoes: {
                    where: { status: "ATIVO" },
                    take: 1,
                    include: { unidade: true },
                  },
                },
              },
            },
            orderBy: [{ dataConvocacao: "asc" }],
          },
        },
      },
      convocados: {
        where: filtroServidores,
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: { status: "ATIVO" },
                take: 1,
                include: { unidade: true },
              },
            },
          },
          convocacao: true,
        },
        orderBy: [{ dataConvocacao: "asc" }],
      },
      homologacoes: {
        where: filtroServidores,
        include: {
          servidor: {
            include: { usuario: true },
          },
          homologadoPor: true,
          aceitoSecadPor: true,
        },
        orderBy: [{ mesReferencia: "asc" }, { criadoEm: "desc" }],
      },
    },
  });
}

export async function buscarRecessoForensePorAno(ano: number) {
  return prisma.recessoForense.findUnique({
    where: { ano },
  });
}

export async function listarRecessosForensesNoPeriodo(
  inicio: Date,
  fimExclusivo: Date,
) {
  return prisma.recessoForense.findMany({
    where: {
      status: {
        not: "CANCELADO",
      },
      dataInicio: {
        lt: fimExclusivo,
      },
      dataFim: {
        gte: inicio,
      },
    },
    orderBy: [{ dataInicio: "asc" }, { ano: "asc" }],
  });
}

export async function listarUnidadesParaRecesso() {
  return prisma.unidadeOrganizacional.findMany({
    where: { ativo: true },
    orderBy: [{ sigla: "asc" }],
  });
}

export async function listarServidoresParaRecesso(
  params: EscopoServidoresRecesso = {},
) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      ...(params.servidorIdsPermitidos
        ? { id: { in: params.servidorIdsPermitidos } }
        : {}),
    },
    include: {
      usuario: true,
      lotacoes: {
        where: { status: "ATIVO" },
        take: 1,
        include: {
          unidade: true,
        },
      },
    },
    orderBy: [{ matricula: "asc" }],
  });
}

export async function buscarServidorPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findUnique({
    where: { usuarioId },
    include: {
      usuario: true,
    },
  });
}

export async function listarRecessosDoServidor(usuarioId: string) {
  const servidor = await buscarServidorPorUsuarioId(usuarioId);

  if (!servidor) {
    return [];
  }

  return prisma.recessoForense.findMany({
    where: {
      OR: [
        {
          convocados: {
            some: {
              servidorId: servidor.id,
            },
          },
        },
        {
          status: {
            in: ["ABERTO", "EM_CONVOCACAO", "EM_EXECUCAO"],
          },
        },
      ],
    },
    include: {
      convocados: {
        where: { servidorId: servidor.id },
        include: {
          convocacao: true,
        },
        orderBy: [{ dataConvocacao: "asc" }],
      },
      homologacoes: {
        where: { servidorId: servidor.id },
      },
    },
    orderBy: { ano: "desc" },
  });
}

export async function listarRecessosPorServidores(servidorIds: string[]) {
  return prisma.recessoForense.findMany({
    where: {
      OR: [
        {
          convocados: {
            some: {
              servidorId: {
                in: servidorIds,
              },
            },
          },
        },
        {
          status: {
            in: ["ABERTO", "EM_CONVOCACAO", "EM_EXECUCAO"],
          },
        },
      ],
    },
    include: {
      convocacoes: {
        where: {
          convocados: {
            some: {
              servidorId: {
                in: servidorIds,
              },
            },
          },
        },
      },
      convocados: {
        where: {
          servidorId: {
            in: servidorIds,
          },
        },
      },
      homologacoes: {
        where: {
          servidorId: {
            in: servidorIds,
          },
        },
      },
    },
    orderBy: { ano: "desc" },
  });
}

export async function listarEspelhoRecessoPorServidor(
  recessoId: string,
  servidorId: string,
) {
  return prisma.espelhoRecesso.findMany({
    where: {
      recessoId,
      servidorId,
    },
    include: {
      convocado: {
        include: {
          convocacao: true,
        },
      },
    },
    orderBy: [{ dataReferencia: "asc" }],
  });
}

export async function listarHomologacoesPendentesRecesso() {
  return prisma.homologacaoRecesso.findMany({
    where: {
      status: {
        in: ["PENDENTE", "HOMOLOGADO"],
      },
    },
    include: {
      recesso: true,
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: { status: "ATIVO" },
            take: 1,
            include: { unidade: true },
          },
        },
      },
      homologadoPor: true,
      aceitoSecadPor: true,
    },
    orderBy: [{ criadoEm: "desc" }],
  });
}
