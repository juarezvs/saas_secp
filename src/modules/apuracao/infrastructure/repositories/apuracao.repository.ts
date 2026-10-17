import { prisma } from "@/shared/infrastructure/database/prisma";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { montarEspelhoMensalCompleto } from "../../application/services/montar-espelho-mensal-completo.service";

export async function buscarServidorComUsuarioPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      orgao: true,
      usuario: true,
      cargo: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          cargo: true,
          unidade: {
            include: {
              orgao: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });
}

export async function listarMarcacoesDoDia(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return prismaListagem.marcacao.findMany({
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
      status: "ATIVO",
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

  const [apuracoes, jornadas, fusoHorario] = await Promise.all([
    prismaListagem.apuracaoDiaria.findMany({
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
              in: ["PENDENTE", "VALIDADO", "DESCONSIDERADO"],
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
    prismaListagem.jornadaServidor.findMany({
      where: {
        servidorId: params.servidorId,
        ativo: true,
        status: "ATIVO",
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
          include: {
            dias: {
              include: {
                faixas: {
                  orderBy: {
                    ordem: "asc",
                  },
                },
              },
              orderBy: [{ ordemNoCiclo: "asc" }, { diaSemana: "asc" }],
            },
          },
        },
      },
      orderBy: {
        dataInicio: "asc",
      },
    }),
    resolverFusoHorarioServidorNoBanco({
      servidorId: params.servidorId,
    }),
  ]);
  const espelho = await montarEspelhoMensalCompleto({
    anoReferencia: params.ano,
    mesReferencia: params.mes,
    apuracoes,
    jornadas,
    fusoHorario,
    servidorId: params.servidorId,
  });

  return espelho.itens;
}

export async function listarSolicitacoesDoServidorNoMes(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  return prismaListagem.solicitacao.findMany({
    where: {
      servidorId: params.servidorId,
      OR: [
        {
          dataReferencia: {
            gte: inicio,
            lt: fim,
          },
        },
        {
          dataReferencia: null,
          dataInicio: {
            lt: fim,
          },
          OR: [{ dataFim: null }, { dataFim: { gte: inicio } }],
        },
      ],
    },
    include: {
      usuarioSolicitante: true,
      analisadaPor: true,
      anexos: {
        orderBy: {
          criadoEm: "asc",
        },
      },
      eventos: {
        include: {
          usuario: true,
        },
        orderBy: {
          criadoEm: "asc",
        },
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function listarApuracoesCalculadasDoServidorNoMes(params: {
  servidorId: string;
  ano: number;
  mes: number;
}) {
  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  return prismaListagem.apuracaoDiaria.findMany({
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
  const apuracoes = await prismaListagem.apuracaoDiaria.findMany({
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

  const marcacoes = await prismaListagem.marcacao.findMany({
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
    include: {
      marcacoesBrutas: {
        select: {
          equipamentoId: true,
          equipamentoCodigo: true,
          arquivoAfd: { select: { equipamentoCodigo: true } },
        },
        orderBy: { criadoEm: "asc" },
      },
      eventosEquipamentoBiometrico: {
        select: { equipamentoId: true },
        orderBy: { recebidoEm: "asc" },
      },
    },
  });

  const metadadosDasMarcacoes = marcacoes.map((marcacao) => {
    return marcacao.metadados && typeof marcacao.metadados === "object" && !Array.isArray(marcacao.metadados)
      ? marcacao.metadados as Record<string, unknown> : {};
  });
  // Registros antigos podem guardar o vínculo apenas nos metadados.
  const idsBrutasLegadas = [...new Set(metadadosDasMarcacoes.flatMap((metadados) => {
    const id = metadados.marcacaoBrutaId;
    return typeof id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ? [id] : [];
  }))];
  const brutasLegadas = idsBrutasLegadas.length
    ? await prismaListagem.marcacaoBruta.findMany({
        where: { id: { in: idsBrutasLegadas }, servidorId: params.servidorId },
        select: { id: true, equipamentoId: true, equipamentoCodigo: true, arquivoAfd: { select: { equipamentoCodigo: true } } },
      }) : [];
  const brutasPorId = new Map(brutasLegadas.map((bruta) => [bruta.id, bruta]));
  const referencias = marcacoes.map((marcacao, indice) => {
    const metadados = metadadosDasMarcacoes[indice];
    const brutaLegada = typeof metadados.marcacaoBrutaId === "string" ? brutasPorId.get(metadados.marcacaoBrutaId) : undefined;
    return {
      id: marcacao.marcacoesBrutas.find((bruta) => bruta.equipamentoId)?.equipamentoId
        ?? marcacao.eventosEquipamentoBiometrico[0]?.equipamentoId
        ?? brutaLegada?.equipamentoId,
      codigo: marcacao.marcacoesBrutas.find((bruta) => bruta.equipamentoCodigo)?.equipamentoCodigo
        ?? (typeof metadados.equipamentoCodigo === "string" ? metadados.equipamentoCodigo : undefined)
        ?? brutaLegada?.equipamentoCodigo
        ?? marcacao.marcacoesBrutas.find((bruta) => bruta.arquivoAfd?.equipamentoCodigo)?.arquivoAfd?.equipamentoCodigo
        ?? brutaLegada?.arquivoAfd?.equipamentoCodigo,
    };
  });
  const ids = [...new Set(referencias.flatMap((ref) => ref.id ? [ref.id] : []))];
  const codigos = [...new Set(referencias.flatMap((ref) => ref.codigo ? [ref.codigo] : []))];
  const equipamentos = ids.length || codigos.length
    ? await prismaListagem.equipamentoBiometrico.findMany({
        where: { OR: [{ id: { in: ids } }, { codigo: { in: codigos } }] },
        // Nunca enviar a configuração do equipamento, que contém credenciais, ao navegador.
        select: { id: true, nome: true, codigo: true, ip: true, porta: true, localizacao: true, fabricante: true, modelo: true, numeroSerie: true },
      }) : [];
  const porId = new Map(equipamentos.map((equipamento) => [equipamento.id, equipamento]));
  const porCodigo = new Map(equipamentos.map((equipamento) => [equipamento.codigo, equipamento]));
  return marcacoes.map(({ marcacoesBrutas: _brutas, eventosEquipamentoBiometrico: _eventos, ...marcacao }, indice) => {
    void _brutas;
    void _eventos;
    const ref = referencias[indice];
    const equipamento = (ref.id ? porId.get(ref.id) : undefined)
      ?? (ref.codigo ? porCodigo.get(ref.codigo) : undefined);
    return { ...marcacao, equipamentoOrigem: equipamento ?? null };
  });
}

type ListarServidoresParaEspelhoPontoParams = {
  usuarioId?: string;
  anoReferencia?: number;
  mesReferencia?: number;
  escopo?: "global" | "chefia";
  orgaoIdsPermitidos?: string[];
  servidorId?: string;
  busca?: string;
  limite?: number;
};

function intervaloReferencia(params: {
  anoReferencia?: number;
  mesReferencia?: number;
}) {
  const hoje = new Date();
  const ano = Number.isInteger(params.anoReferencia)
    ? params.anoReferencia!
    : hoje.getFullYear();
  const mes =
    Number.isInteger(params.mesReferencia) &&
    params.mesReferencia! >= 1 &&
    params.mesReferencia! <= 12
      ? params.mesReferencia!
      : hoje.getMonth() + 1;

  return {
    inicio: new Date(ano, mes - 1, 1),
    fim: new Date(ano, mes, 1),
  };
}

async function listarIdsUnidadesSubordinadasParaEspelho(params: {
  usuarioId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const { inicio, fim } = intervaloReferencia(params);
  const gestores = await prismaListagem.gestorUnidade.findMany({
    where: {
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
      servidor: {
        usuarioId: params.usuarioId,
        ativo: true,
      },
    },
    select: {
      unidadeId: true,
    },
  });

  const visitadas = new Set(gestores.map((gestor) => gestor.unidadeId));
  let fronteira = Array.from(visitadas);

  while (fronteira.length > 0) {
    const filhas = await prismaListagem.unidadeOrganizacional.findMany({
      where: {
        ativo: true,
        unidadePaiId: {
          in: fronteira,
        },
      },
      select: {
        id: true,
      },
    });

    const novas = filhas
      .map((unidade) => unidade.id)
      .filter((id) => !visitadas.has(id));

    for (const id of novas) {
      visitadas.add(id);
    }

    fronteira = novas;
  }

  return Array.from(visitadas);
}

export async function listarServidoresParaEspelhoPonto(
  params: ListarServidoresParaEspelhoPontoParams = {},
) {
  if (params.escopo === "chefia" && !params.usuarioId) {
    return [];
  }

  const { inicio, fim } = intervaloReferencia({
    anoReferencia: params.anoReferencia,
    mesReferencia: params.mesReferencia,
  });
  const unidadesSubordinadas =
    params.escopo === "chefia" && params.usuarioId
      ? await listarIdsUnidadesSubordinadasParaEspelho({
          usuarioId: params.usuarioId,
          anoReferencia: params.anoReferencia ?? inicio.getFullYear(),
          mesReferencia: params.mesReferencia ?? inicio.getMonth() + 1,
        })
      : null;

  if (params.escopo === "chefia" && unidadesSubordinadas?.length === 0) {
    return [];
  }

  const busca = params.busca?.trim();
  const filtroBusca = busca
    ? {
        OR: [
          {
            matricula: {
              contains: busca,
              mode: "insensitive" as const,
            },
          },
          {
            nomeFuncional: {
              contains: busca,
              mode: "insensitive" as const,
            },
          },
          {
            nomeCompletoSarh: {
              contains: busca,
              mode: "insensitive" as const,
            },
          },
          {
            usuario: {
              nome: {
                contains: busca,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }
    : {};

  return prismaListagem.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
      ...(params.servidorId ? { id: params.servidorId } : {}),
      ...filtroBusca,
      ...(params.orgaoIdsPermitidos
        ? {
            orgaoId: {
              in: params.orgaoIdsPermitidos,
            },
          }
        : {}),
      ...(unidadesSubordinadas
        ? {
            lotacoes: {
              some: {
                status: "ATIVO",
                unidadeId: {
                  in: unidadesSubordinadas,
                },
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
          }
        : {}),
    },
    include: {
      orgao: true,
      cargo: true,
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          cargo: true,
          unidade: {
            include: {
              orgao: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
    orderBy: {
      matricula: "asc",
    },
    ...(params.limite ? { take: params.limite } : {}),
  });
}
