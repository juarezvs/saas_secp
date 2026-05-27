import { prisma } from "@/shared/infrastructure/database/prisma";

export async function buscarServidorBancoHorasPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
      bancoHorasSaldo: true,
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
      movimentosBancoHoras: {
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

export async function listarServidoresComBancoHoras() {
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