import { prisma } from "@/shared/infrastructure/database/prisma";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { montarEspelhoMensalCompleto } from "../../application/services/montar-espelho-mensal-completo.service";

export async function buscarServidorComUsuarioPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
    },
  });
}

export async function listarMarcacoesDoDia(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: params.dataReferencia,
      status: {
        in: ["VALIDA", "PENDENTE"],
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });
}

export async function buscarJornadaVigenteParaData(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return prisma.jornadaServidor.findFirst({
    where: {
      servidorId: params.servidorId,
      ativo: true,
      dataInicio: {
        lte: params.dataReferencia,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: params.dataReferencia,
          },
        },
      ],
    },
    include: {
      jornada: true,
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
}

export async function buscarApuracaoDiaria(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return prisma.apuracaoDiaria.findUnique({
    where: {
      servidorId_dataReferencia: {
        servidorId: params.servidorId,
        dataReferencia: params.dataReferencia,
      },
    },
    include: {
      ocorrencias: true,
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function listarApuracoesDoServidorNoMes(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  const [apuracoes, jornadas] = await Promise.all([
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
    apuracoes,
    jornadas,
    fusoHorario,
  });

  return espelho.itens;
}

export async function listarApuracoesCalculadasDoServidorNoMes(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  return prisma.apuracaoDiaria.findMany({
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
}

export async function listarCompetenciasApuracaoDoServidor(servidorId: string) {
  const apuracoes = await prisma.apuracaoDiaria.findMany({
    where: {
      servidorId,
    },

    select: {
      dataReferencia: true,
    },

    orderBy: {
      dataReferencia: "desc",
    },
  });

  const mapa = new Map<
    string,
    {
      ano: number;
      mes: number;
      label: string;
    }
  >();

  for (const item of apuracoes) {
    const data = new Date(item.dataReferencia);

    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + 1;

    const chave = `${ano}-${String(mes).padStart(2, "0")}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        ano,
        mes,

        label: new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(data),
      });
    }
  }

  return Array.from(mapa.values());
}

export async function listarMarcacoesDoServidorNoMes(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));

  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  return prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,

      dataReferencia: {
        gte: inicio,
        lt: fim,
      },

      status: {
        in: ["VALIDA", "AJUSTADA", "PENDENTE"],
      },
    },

    orderBy: {
      dataHora: "asc",
    },
  });
}

export async function listarServidoresParaEspelhoPonto() {
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
