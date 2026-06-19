import { prisma } from "@/shared/infrastructure/database/prisma";

function periodoCompetencia(anoReferencia: number, mesReferencia: number) {
  return {
    inicio: new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1)),
    fim: new Date(Date.UTC(anoReferencia, mesReferencia, 1)),
  };
}

function filtroLotacaoNaCompetencia(
  anoReferencia: number,
  mesReferencia: number,
) {
  const { inicio, fim } = periodoCompetencia(anoReferencia, mesReferencia);

  return {
    dataInicio: { lt: fim },
    OR: [{ dataFim: null }, { dataFim: { gte: inicio } }],
  };
}

export async function buscarServidorBancoHorasPorUsuarioId(
  usuarioId: string,
  params: {
    anoReferencia: number;
    mesReferencia: number;
  },
) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
      bancoHorasSaldo: true,
      lotacoes: {
        where: filtroLotacaoNaCompetencia(
          params.anoReferencia,
          params.mesReferencia,
        ),
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

export async function buscarSaldoBancoHoras(servidorId: string) {
  return prisma.bancoHorasSaldo.findUnique({
    where: {
      servidorId,
    },
  });
}

export async function listarMovimentosBancoHoras(params: {
  servidorId: string;
  limite?: number;
}) {
  return prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
    },
    orderBy: [
      {
        dataReferencia: "desc",
      },
      {
        criadoEm: "desc",
      },
    ],
    take: params.limite ?? 100,
    include: {
      apuracaoDiaria: true,
    },
  });
}

export async function listarMovimentosBancoHorasMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  return prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
}

export async function listarMovimentosComposicaoSaldoBancoHoras(params: {
  servidorId: string;
}) {
  return prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      tipo: {
        in: ["CREDITO", "DEBITO"],
      },
      status: {
        in: ["PENDENTE", "VALIDADO"],
      },
    },
    orderBy: [
      {
        dataReferencia: "asc",
      },
      {
        criadoEm: "asc",
      },
    ],
  });
}

export async function listarAutorizacoesBancoHorasMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const inicio = new Date(params.anoReferencia, params.mesReferencia - 1, 1);
  const fim = new Date(params.anoReferencia, params.mesReferencia, 1);

  return prisma.autorizacaoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      dataInicio: {
        lt: fim,
      },
      dataFim: {
        gte: inicio,
      },
    },
    include: {
      autorizadoPor: {
        select: {
          nome: true,
        },
      },
      solicitacao: {
        select: {
          id: true,
          titulo: true,
        },
      },
      movimentos: {
        where: {
          status: {
            in: ["PENDENTE", "VALIDADO"],
          },
        },
        select: {
          minutos: true,
        },
      },
    },
    orderBy: {
      autorizadoEm: "desc",
    },
  });
}

export async function listarApuracoesCalculadasSemMovimento(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const inicio = new Date(params.anoReferencia, params.mesReferencia - 1, 1);
  const fim = new Date(params.anoReferencia, params.mesReferencia, 1);

  return prisma.apuracaoDiaria.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
      },
      status: {
        in: ["CALCULADA", "INCONSISTENTE"],
      },
      OR: [
        {
          minutosCredito: {
            gt: 0,
          },
        },
        {
          minutosDebito: {
            gt: 0,
          },
        },
      ],
      movimentoBancoHoras: {
        none: {},
      },
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
}

export async function somarCreditoValidadoNoMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const resultado = await prisma.movimentoBancoHoras.aggregate({
    where: {
      servidorId: params.servidorId,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      tipo: "CREDITO",
      status: {
        in: ["PENDENTE", "VALIDADO"],
      },
    },
    _sum: {
      minutos: true,
    },
  });

  return resultado._sum.minutos ?? 0;
}

export async function listarServidoresComBancoHoras(params: {
  anoReferencia: number;
  mesReferencia: number;
}) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    include: {
      usuario: true,
      bancoHorasSaldo: true,
      lotacoes: {
        where: filtroLotacaoNaCompetencia(
          params.anoReferencia,
          params.mesReferencia,
        ),
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
