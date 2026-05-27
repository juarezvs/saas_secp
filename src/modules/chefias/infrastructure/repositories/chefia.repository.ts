import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarServidoresAtivosParaGestao() {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    orderBy: {
      matricula: "asc",
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

export async function listarUnidadesAtivasParaGestao() {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    orderBy: [
      {
        sigla: "asc",
      },
      {
        nome: "asc",
      },
    ],
    select: {
      id: true,
      sigla: true,
      nome: true,
      tipo: true,
      unidadePaiId: true,
    },
  });
}

export async function buscarUnidadeComGestores(unidadeId: string) {
  return prisma.unidadeOrganizacional.findUnique({
    where: {
      id: unidadeId,
    },
    include: {
      orgao: true,
      unidadePai: true,
      gestores: {
        orderBy: [
          {
            ativo: "desc",
          },
          {
            dataInicio: "desc",
          },
        ],
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
        },
      },
    },
  });
}

export async function listarUnidadesComGestores() {
  return prisma.unidadeOrganizacional.findMany({
    orderBy: [
      {
        sigla: "asc",
      },
      {
        nome: "asc",
      },
    ],
    include: {
      orgao: true,
      unidadePai: true,
      gestores: {
        where: {
          ativo: true,
        },
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
        orderBy: {
          papel: "asc",
        },
      },
      _count: {
        select: {
          lotacoes: true,
          unidadesFilhas: true,
        },
      },
    },
  });
}

export async function buscarGestorUnidadePorId(gestorUnidadeId: string) {
  return prisma.gestorUnidade.findUnique({
    where: {
      id: gestorUnidadeId,
    },
    include: {
      unidade: true,
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function existeGestorAtivoComMesmoPapel(params: {
  unidadeId: string;
  papel: string;
  ignorarGestorUnidadeId?: string;
}) {
  const gestor = await prisma.gestorUnidade.findFirst({
    where: {
      unidadeId: params.unidadeId,
      papel: params.papel as never,
      ativo: true,
      dataFim: null,
      id: params.ignorarGestorUnidadeId
        ? {
            not: params.ignorarGestorUnidadeId,
          }
        : undefined,
    },
  });

  return Boolean(gestor);
}