import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarFechamentosMensaisParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  anoReferencia?: string;
  mesReferencia?: string;
  unidade?: string;
  status?: string;
};

function ehStatusFechamento(valor?: string | null) {
  return [
    "ABERTO",
    "EM_HOMOLOGACAO",
    "HOMOLOGADO",
    "HOMOLOGADO_PARCIAL",
    "CANCELADO",
  ].includes(valor ?? "");
}

export function montarWhereFechamentosMensais(
  params: ListarFechamentosMensaisParams = {},
) {
  const busca = params.busca?.trim();
  const anoReferencia = Number(params.anoReferencia);
  const mesReferencia = Number(params.mesReferencia);

  return {
    ...(Number.isInteger(anoReferencia) && anoReferencia > 0
      ? { anoReferencia }
      : {}),
    ...(Number.isInteger(mesReferencia) &&
    mesReferencia >= 1 &&
    mesReferencia <= 12
      ? { mesReferencia }
      : {}),
    ...(params.status && ehStatusFechamento(params.status)
      ? { status: params.status as never }
      : {}),
    ...(params.unidade
      ? {
          unidade: {
            OR: [
              {
                sigla: {
                  contains: params.unidade,
                  mode: "insensitive" as const,
                },
              },
              {
                nome: {
                  contains: params.unidade,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        }
      : {}),
    ...(busca
      ? {
          OR: [
            {
              unidade: {
                OR: [
                  { sigla: { contains: busca, mode: "insensitive" as const } },
                  { nome: { contains: busca, mode: "insensitive" as const } },
                ],
              },
            },
            {
              abertoPor: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              homologadoPor: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

const includeFechamentoListagem = {
  unidade: true,
  abertoPor: true,
  homologadoPor: true,
  servidores: {
    select: {
      id: true,
      status: true,
    },
  },
};

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
    include: includeFechamentoListagem,
    take: 100,
  });
}

export async function listarFechamentosMensaisPaginado(
  params: ListarFechamentosMensaisParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereFechamentosMensais(params);

  const [total, fechamentos] = await Promise.all([
    prisma.fechamentoMensalUnidade.count({ where }),
    prisma.fechamentoMensalUnidade.findMany({
      where,
      orderBy: [
        { anoReferencia: "desc" },
        { mesReferencia: "desc" },
        { criadoEm: "desc" },
      ],
      include: includeFechamentoListagem,
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    fechamentos,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarFechamentosMensaisParaExportacao(
  params: ListarFechamentosMensaisParams,
) {
  return prisma.fechamentoMensalUnidade.findMany({
    where: montarWhereFechamentosMensais(params),
    orderBy: [
      { anoReferencia: "desc" },
      { mesReferencia: "desc" },
      { criadoEm: "desc" },
    ],
    include: includeFechamentoListagem,
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

export async function buscarHomologacaoServidorMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  return prisma.homologacaoServidorMes.findFirst({
    where: {
      servidorId: params.servidorId,
      fechamento: {
        anoReferencia: params.anoReferencia,
        mesReferencia: params.mesReferencia,
      },
    },
    include: {
      homologadoPor: true,
      fechamento: {
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
        },
      },
    },
  });
}

export async function verificarEnvioEspelhoServidor(homologacaoServidorMesId: string) {
  const envio = await prisma.auditoriaEvento.findFirst({
    where: {
      entidade: "HomologacaoServidorMes",
      entidadeId: homologacaoServidorMesId,
      acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
    },
    select: {
      id: true,
    },
  });

  return Boolean(envio);
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
          status: "ATIVO",
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
          status: "ATIVO",
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

export async function listarJornadasServidorMes(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const inicio = new Date(
    Date.UTC(params.anoReferencia, params.mesReferencia - 1, 1),
  );
  const fim = new Date(Date.UTC(params.anoReferencia, params.mesReferencia, 1));

  return prisma.jornadaServidor.findMany({
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
