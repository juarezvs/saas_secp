import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";

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
    status: "ATIVO" as const,
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
  orgaoIdsPermitidos?: string[];
}) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
      ...(params.orgaoIdsPermitidos
        ? {
            orgaoId: {
              in: params.orgaoIdsPermitidos,
            },
          }
        : {}),
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

export async function listarServidoresSubordinadosComBancoHoras(params: {
  usuarioId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  if (unidadesSubordinadas.length === 0) {
    return [];
  }

  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
      usuarioId: {
        not: params.usuarioId,
      },
      lotacoes: {
        some: {
          status: "ATIVO",
          unidadeId: {
            in: unidadesSubordinadas,
          },
        },
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

export async function listarServidoresGestaoBancoHoras(params: {
  orgaoIdsPermitidos?: string[];
  unidadeIdsPermitidas?: string[];
  busca?: string;
}) {
  const busca = params.busca?.trim();

  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
      ...(params.orgaoIdsPermitidos
        ? {
            orgaoId: {
              in: params.orgaoIdsPermitidos,
            },
          }
        : {}),
      ...(params.unidadeIdsPermitidas
        ? {
            lotacoes: {
              some: {
                status: "ATIVO",
                unidadeId: {
                  in: params.unidadeIdsPermitidas,
                },
              },
            },
          }
        : {}),
      ...(busca
        ? {
            OR: [
              { matricula: { contains: busca, mode: "insensitive" as const } },
              {
                nomeFuncional: {
                  contains: busca,
                  mode: "insensitive" as const,
                },
              },
              {
                usuario: {
                  nome: { contains: busca, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
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
        take: 1,
      },
    },
    orderBy: [{ orgao: { sigla: "asc" } }, { matricula: "asc" }],
  });
}

export async function buscarServidorGestaoBancoHoras(params: {
  servidorId: string;
  orgaoIdsPermitidos?: string[];
  unidadeIdsPermitidas?: string[];
}) {
  return prisma.servidor.findFirst({
    where: {
      id: params.servidorId,
      ativo: true,
      ...(params.orgaoIdsPermitidos
        ? {
            orgaoId: {
              in: params.orgaoIdsPermitidos,
            },
          }
        : {}),
      ...(params.unidadeIdsPermitidas
        ? {
            lotacoes: {
              some: {
                status: "ATIVO",
                unidadeId: {
                  in: params.unidadeIdsPermitidas,
                },
              },
            },
          }
        : {}),
    },
    include: {
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
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
}

export async function listarMovimentosTransferiveisBancoHoras(params: {
  servidorId: string;
  limite?: number;
}) {
  return prisma.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
      tipo: {
        in: ["CREDITO", "DEBITO"],
      },
      status: {
        in: ["PENDENTE", "VALIDADO", "EXPIRADO"],
      },
      expiraEm: {
        not: null,
      },
    },
    orderBy: [{ expiraEm: "asc" }, { dataReferencia: "asc" }],
    take: params.limite ?? 20,
  });
}

export async function listarConsolidadoBancoHorasPorCompetencia(params: {
  servidorId: string;
}) {
  return prisma.movimentoBancoHoras.groupBy({
    by: ["anoReferencia", "mesReferencia", "tipo", "status"],
    where: {
      servidorId: params.servidorId,
      tipo: {
        in: ["CREDITO", "DEBITO", "COMPENSACAO_CREDITO", "COMPENSACAO_DEBITO"],
      },
      status: {
        in: ["PENDENTE", "VALIDADO"],
      },
    },
    _sum: {
      minutos: true,
    },
    orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
  });
}

export async function listarSolicitacoesBancoHorasServidor(params: {
  servidorId: string;
  limite?: number;
}) {
  return prisma.solicitacao.findMany({
    where: {
      servidorId: params.servidorId,
      tipo: {
        in: ["COMPENSACAO", "HORA_CREDITO_PREVIA", "FOLGA_BANCO_HORAS"],
      },
    },
    select: {
      id: true,
      tipo: true,
      status: true,
      titulo: true,
      descricao: true,
      dataInicio: true,
      dataFim: true,
      dadosSolicitados: true,
      criadoEm: true,
      analisadaEm: true,
      justificativaAnalise: true,
    },
    orderBy: {
      criadoEm: "desc",
    },
    take: params.limite ?? 20,
  });
}

export async function listarVencimentosBancoHoras(params: {
  servidorIds?: string[];
  orgaoIdsPermitidos?: string[];
  apenasVencidos?: boolean;
  limite?: number;
}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ate = new Date(hoje);
  ate.setDate(ate.getDate() + 30);

  return prisma.movimentoBancoHoras.findMany({
    where: {
      tipo: {
        in: ["CREDITO", "DEBITO"],
      },
      status: {
        in: ["PENDENTE", "VALIDADO", "EXPIRADO"],
      },
      expiraEm: params.apenasVencidos
        ? {
            lt: hoje,
          }
        : {
            not: null,
            lte: ate,
          },
      ...(params.servidorIds
        ? {
            servidorId: {
              in: params.servidorIds,
            },
          }
        : {}),
      ...(params.orgaoIdsPermitidos
        ? {
            servidor: {
              orgaoId: {
                in: params.orgaoIdsPermitidos,
              },
            },
          }
        : {}),
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          orgao: {
            select: {
              sigla: true,
            },
          },
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              unidade: {
                select: {
                  sigla: true,
                  nome: true,
                },
              },
            },
            orderBy: {
              dataInicio: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ expiraEm: "asc" }, { dataReferencia: "asc" }],
    take: params.limite ?? 100,
  });
}

export async function listarPainelChefiaBancoHoras(params: {
  usuarioId: string;
}) {
  const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  if (unidadesSubordinadas.length === 0) {
    return {
      servidores: [],
      solicitacoesPendentes: [],
      vencimentos: [],
      movimentosSemAutorizacao: [],
      unidadesSubordinadas,
    };
  }

  const whereSubordinados = {
    ativo: true,
    usuarioId: {
      not: params.usuarioId,
    },
    lotacoes: {
      some: {
        status: "ATIVO" as const,
        unidadeId: {
          in: unidadesSubordinadas,
        },
      },
    },
  };

  const servidores = await prisma.servidor.findMany({
    where: whereSubordinados,
    include: {
      usuario: true,
      bancoHorasSaldo: true,
      orgao: {
        select: {
          sigla: true,
        },
      },
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
        take: 1,
      },
    },
    orderBy: {
      matricula: "asc",
    },
  });
  const servidorIds = servidores.map((servidor) => servidor.id);

  const [solicitacoesPendentes, vencimentos, movimentosSemAutorizacao] =
    await Promise.all([
      prisma.solicitacao.findMany({
        where: {
          servidorId: {
            in: servidorIds,
          },
          tipo: {
            in: ["COMPENSACAO", "HORA_CREDITO_PREVIA", "FOLGA_BANCO_HORAS"],
          },
          status: {
            in: ["ENVIADA", "EM_ANALISE"],
          },
        },
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
                take: 1,
              },
            },
          },
        },
        orderBy: {
          criadoEm: "asc",
        },
        take: 50,
      }),
      listarVencimentosBancoHoras({
        servidorIds,
        limite: 80,
      }),
      prisma.movimentoBancoHoras.findMany({
        where: {
          servidorId: {
            in: servidorIds,
          },
          tipo: {
            in: ["HORAS_NAO_AUTORIZADAS", "HORAS_ACIMA_LIMITE"],
          },
          status: {
            in: ["PENDENTE", "VALIDADO"],
          },
        },
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
                take: 1,
              },
            },
          },
        },
        orderBy: [{ dataReferencia: "desc" }, { criadoEm: "desc" }],
        take: 50,
      }),
    ]);

  return {
    servidores,
    solicitacoesPendentes,
    vencimentos,
    movimentosSemAutorizacao,
    unidadesSubordinadas,
  };
}
