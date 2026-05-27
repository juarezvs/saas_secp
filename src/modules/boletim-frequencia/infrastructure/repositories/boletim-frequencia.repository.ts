import { prisma } from "@/shared/infrastructure/database/prisma";

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
    include: {
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
    },
    take: 100,
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

export async function listarFechamentosHomologadosSemBoletim() {
  return prisma.fechamentoMensalUnidade.findMany({
    where: {
      status: "HOMOLOGADO",
      boletimFrequencia: null,
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
