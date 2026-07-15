import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  resolverFusoHorarioServidor,
  resolverFusoHorarioServidorNoBanco,
} from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { obterDataReferencia } from "../../application/services/data-marcacao.service";

export async function buscarServidorPorUsuarioId(
  usuarioId: string,
  matricula?: string | null,
) {
  const matriculaNormalizada = matricula?.trim();

  return prisma.servidor.findFirst({
    where: {
      OR: [
        { usuarioId },
        ...(matriculaNormalizada
          ? [
              {
                matricula: {
                  equals: matriculaNormalizada,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
      ativo: true,
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          cargo: true,
          unidade: {
            include: {
                orgao: {
                  select: {
                    sigla: true,
                    nome: true,
                    fusoHorario: true,
                  },
                },
              unidadePai: {
                include: {
                    orgao: {
                      select: {
                        sigla: true,
                        nome: true,
                        fusoHorario: true,
                      },
                    },
                  unidadePai: {
                    include: {
                        orgao: {
                          select: {
                            sigla: true,
                            nome: true,
                            fusoHorario: true,
                          },
                        },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      cargo: true,
      jornadas: {
        where: {
          ativo: true,
          dataFim: null,
        },
        include: {
          jornada: true,
          escala: {
            include: {
              dias: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      biometriaFacialServidor: true,
    },
  });
}

export async function listarMarcacoesDoServidorNoDia(params: {
  servidorId: string;
  dataHora: Date;
  fusoHorario?: string | null;
}) {
  const fusoHorario =
    params.fusoHorario ??
    (await resolverFusoHorarioServidorNoBanco({
      servidorId: params.servidorId,
    }));
  const dataReferencia = obterDataReferencia(params.dataHora, fusoHorario);

  return prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia,
      status: {
        in: ["VALIDA", "PENDENTE"],
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });
}

export async function listarMarcacoesDoUsuarioNoDia(usuarioId: string) {
  const agora = new Date();
  const servidor = await buscarServidorPorUsuarioId(usuarioId);

  if (!servidor) {
    return {
      servidor: null,
      marcacoes: [],
    };
  }

  const marcacoes = await listarMarcacoesDoServidorNoDia({
    servidorId: servidor.id,
    dataHora: agora,
    fusoHorario: resolverFusoHorarioServidor(servidor),
  });

  return {
    servidor,
    marcacoes,
  };
}

export async function listarHistoricoMarcacoesDoUsuario(params: {
  usuarioId: string;
  limite?: number;
  anoReferencia?: number;
  mesReferencia?: number;
}) {
  const servidor = await buscarServidorPorUsuarioId(params.usuarioId);

  if (!servidor) {
    return {
      servidor: null,
      marcacoes: [],
    };
  }

  const fusoHorario = resolverFusoHorarioServidor(servidor);
  const dataReferenciaHoje = obterDataReferencia(new Date(), fusoHorario);
  const inicioCompetencia =
    params.anoReferencia && params.mesReferencia
      ? new Date(Date.UTC(params.anoReferencia, params.mesReferencia - 1, 1))
      : null;
  const fimCompetencia =
    params.anoReferencia && params.mesReferencia
      ? new Date(Date.UTC(params.anoReferencia, params.mesReferencia, 1))
      : null;
  const marcacoes = await prisma.marcacao.findMany({
    take: inicioCompetencia ? undefined : (params.limite ?? 100),
    where: {
      servidorId: servidor.id,
      dataReferencia: inicioCompetencia
        ? {
            gte: inicioCompetencia,
            lt: fimCompetencia!,
          }
        : {
            lt: dataReferenciaHoje,
          },
      status: {
        in: ["VALIDA", "PENDENTE"],
      },
    },
    orderBy: {
      dataHora: "desc",
    },
  });

  return {
    servidor,
    marcacoes,
  };
}

export async function listarUltimasMarcacoes(params?: {
  limite?: number;
  servidorId?: string | null;
  servidorIdsPermitidos?: string[];
}) {
  return prisma.marcacao.findMany({
    take: params?.limite ?? 50,
    where: {
      ...(params?.servidorId ? { servidorId: params.servidorId } : {}),
      ...(!params?.servidorId && params?.servidorIdsPermitidos !== undefined
        ? { servidorId: { in: params.servidorIdsPermitidos } }
        : {}),
    },
    orderBy: {
      dataHora: "desc",
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
              unidade: {
                include: {
                  orgao: {
                    select: {
                      sigla: true,
                    },
                  },
                  unidadePai: {
                    include: {
                      orgao: {
                        select: {
                          sigla: true,
                        },
                      },
                      unidadePai: {
                        include: {
                          orgao: {
                            select: {
                              sigla: true,
                            },
                          },
                          unidadePai: {
                            include: {
                              orgao: {
                                select: {
                                  sigla: true,
                                },
                              },
                              unidadePai: {
                                include: {
                                  orgao: {
                                    select: {
                                      sigla: true,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              dataInicio: "desc",
            },
          },
        },
      },
    },
  });
}

export async function listarServidoresParaFiltroMarcacoes(params?: {
  servidorIdsPermitidos?: string[];
}) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      ...(params?.servidorIdsPermitidos !== undefined
        ? { id: { in: params.servidorIdsPermitidos } }
        : {}),
    },
    orderBy: [{ nomeFuncional: "asc" }, { matricula: "asc" }],
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      usuario: {
        select: {
          nome: true,
        },
      },
    },
  });
}
