import { prisma } from "@/shared/infrastructure/database/prisma";
import { montarEspelhoMensalCompleto } from "@/modules/apuracao/application/services/montar-espelho-mensal-completo.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";

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
  const inicioMarcacoes = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fimMarcacoes = new Date(Date.UTC(params.ano, params.mes, 1));

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

  const [apuracoesCalculadas, jornadas] = await Promise.all([
    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId: params.servidorId,
        dataReferencia: {
          gte: inicio,
          lt: fim,
        },
      },
      include: {
        ocorrencias: true,
        movimentoBancoHoras: {
          where: {
            status: {
              in: ["PENDENTE", "VALIDADO"],
            },
          },
          include: {
            autorizacaoBancoHoras: {
              select: {
                solicitacao: {
                  select: {
                    id: true,
                    tipo: true,
                    titulo: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        dataReferencia: "asc",
      },
    }),
    prisma.jornadaServidor.findMany({
      where: {
        servidorId: params.servidorId,
        ativo: true,
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
      include: {
        jornada: {
          select: {
            cargaDiariaMinutos: true,
          },
        },
      },
      orderBy: {
        dataInicio: "asc",
      },
    }),
  ]);
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: params.servidorId,
  });
  const espelho = await montarEspelhoMensalCompleto({
    anoReferencia: params.ano,
    mesReferencia: params.mes,
    apuracoes: apuracoesCalculadas,
    jornadas,
    fusoHorario,
    servidorId: params.servidorId,
  });

  const marcacoes = await prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: inicioMarcacoes,
        lt: fimMarcacoes,
      },
      status: {
        in: ["VALIDA", "AJUSTADA", "PENDENTE"],
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });

  return {
    servidor,
    apuracoes: espelho.itens,
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
