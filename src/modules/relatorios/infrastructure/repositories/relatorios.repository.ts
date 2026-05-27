import { prisma } from "@/shared/infrastructure/database/prisma";

export async function buscarServidorRelatorioPorUsuarioId(usuarioId: string) {
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

export async function listarServidoresParaRelatorio() {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
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
    orderBy: {
      matricula: "asc",
    },
  });
}

export async function listarBoletinsParaRelatorio() {
  return prisma.boletimFrequencia.findMany({
    include: {
      unidade: true,
    },
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
    take: 100,
  });
}

export async function buscarDadosBoletimPdf(boletimId: string) {
  return prisma.boletimFrequencia.findUnique({
    where: {
      id: boletimId,
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

export async function buscarDadosEspelhoPontoPdf(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(params.ano, params.mes - 1, 1);
  const fim = new Date(params.ano, params.mes, 1);

  const servidor = await prisma.servidor.findUnique({
    where: {
      id: params.servidorId,
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
      jornadas: {
        where: {
          ativo: true,
        },
        include: {
          jornada: true,
          escala: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });

  const apuracoes = await prisma.apuracaoDiaria.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
      },
    },
    include: {
      ocorrencias: true,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });

  const marcacoes = await prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });

  return {
    servidor,
    apuracoes,
    marcacoes,
    ano: params.ano,
    mes: params.mes,
  };
}

export async function buscarDadosBancoHorasPdf(params: {
  servidorId: string;
  ano?: number;
  mes?: number;
}) {
  const servidor = await prisma.servidor.findUnique({
    where: {
      id: params.servidorId,
    },
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
  });

  const whereMovimentos =
    params.ano && params.mes
      ? {
          servidorId: params.servidorId,
          anoReferencia: params.ano,
          mesReferencia: params.mes,
        }
      : {
          servidorId: params.servidorId,
        };

  const movimentos = await prisma.movimentoBancoHoras.findMany({
    where: whereMovimentos,
    orderBy: [
      {
        dataReferencia: "asc",
      },
      {
        criadoEm: "asc",
      },
    ],
  });

  return {
    servidor,
    movimentos,
    ano: params.ano ?? null,
    mes: params.mes ?? null,
  };
}
