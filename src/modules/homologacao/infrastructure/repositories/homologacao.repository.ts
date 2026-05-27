import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarUnidadesParaHomologacao() {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      sigla: true,
      nome: true,
      tipo: true,
    },
  });
}

export async function listarFechamentosMensais() {
  return prisma.fechamentoMensalUnidade.findMany({
    orderBy: [
      { anoReferencia: "desc" },
      { mesReferencia: "desc" },
      { criadoEm: "desc" },
    ],
    include: {
      unidade: true,
      abertoPor: true,
      homologadoPor: true,
      servidores: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    take: 100,
  });
}

export async function buscarFechamentoPorId(id: string) {
  return prisma.fechamentoMensalUnidade.findUnique({
    where: {
      id,
    },
    include: {
      boletimFrequencia: true,
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
      abertoPor: true,
      homologadoPor: true,
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
              bancoHorasSaldo: true,
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
    },
  });
}

export async function buscarHomologacaoServidorPorId(id: string) {
  return prisma.homologacaoServidorMes.findUnique({
    where: {
      id,
    },
    include: {
      fechamento: true,
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function listarServidoresDaUnidadeNoMes(params: {
  unidadeId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const inicio = new Date(params.anoReferencia, params.mesReferencia - 1, 1);
  const fim = new Date(params.anoReferencia, params.mesReferencia, 1);

  return prisma.servidor.findMany({
    where: {
      ativo: true,
      lotacoes: {
        some: {
          unidadeId: params.unidadeId,
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
      },
    },
    include: {
      usuario: true,
      bancoHorasSaldo: true,
      lotacoes: {
        where: {
          unidadeId: params.unidadeId,
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

export async function listarApuracoesServidorMes(params: {
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
    },
    include: {
      ocorrencias: true,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
}

export async function listarSolicitacoesPendentesServidorMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const inicio = new Date(params.anoReferencia, params.mesReferencia - 1, 1);
  const fim = new Date(params.anoReferencia, params.mesReferencia, 1);

  return prisma.solicitacao.findMany({
    where: {
      servidorId: params.servidorId,
      status: {
        in: ["ENVIADA", "EM_ANALISE"],
      },
      OR: [
        {
          dataReferencia: {
            gte: inicio,
            lt: fim,
          },
        },
        {
          dataInicio: {
            gte: inicio,
            lt: fim,
          },
        },
      ],
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarMovimentosPendentesBancoHorasMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  return prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      status: "PENDENTE",
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
}
