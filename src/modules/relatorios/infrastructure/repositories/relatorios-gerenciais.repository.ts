import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export type TipoRelatorioGerencial =
  | "HORAS_EXTRAS_BANCO_HORAS"
  | "ABSENTEISMO"
  | "JORNADA_TRABALHADA";

type EscopoRelatorioParams = {
  usuarioId: string;
  permissoes: string[];
  servidorId?: string | null;
  modo?: "consultar" | "exportar";
};

export type ServidorRelatorioGerencial = {
  id: string;
  matricula: string;
  nome: string;
  unidade: string;
  usuarioId: string;
  saldoBancoHorasMinutos: number;
};

export type LinhaRelatorioGerencial = ServidorRelatorioGerencial & {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  diasComApuracao: number;
  diasTrabalhados: number;
  faltas: number;
  diasComAtrasoOuSaidaAntecipada: number;
  inconsistencias: number;
};

export type DadosRelatorioGerencial = {
  tipo: TipoRelatorioGerencial;
  ano: number;
  mes: number;
  linhas: LinhaRelatorioGerencial[];
  escopo: "proprio" | "chefia" | "global";
};

function possuiPermissao(
  permissoes: string[],
  acao: "consultar" | "exportar",
  escopo: "proprio" | "chefia" | "global",
) {
  return permissoes.includes(`relatorios-gerenciais:${acao}:${escopo}`);
}

async function buscarServidorProprio(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    select: {
      id: true,
    },
  });
}

export type LinhaLotacaoComChefia = {
  id: string;
  orgao: string;
  sigla: string;
  nome: string;
  unidadePai: string;
  quantidadeServidores: number;
  quantidadeUnidadesFilhas: number;
  chefias: string;
};

export async function listarLotacoesComChefiasRegistradas(params: {
  usuarioId: string;
  permissoes: string[];
}) {
  const podeGlobal = params.permissoes.includes(
    "relatorios-gerenciais:exportar:global",
  );
  const podeChefia = params.permissoes.includes(
    "relatorios-gerenciais:exportar:chefia",
  );

  if (!podeGlobal && !podeChefia) {
    return [];
  }

  const unidadesPermitidas = podeGlobal
    ? null
    : await listarIdsUnidadesSubordinadasPorUsuario(params.usuarioId);

  if (unidadesPermitidas && unidadesPermitidas.length === 0) {
    return [];
  }

  const unidades = await prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
      ...(unidadesPermitidas
        ? {
            id: {
              in: unidadesPermitidas,
            },
          }
        : {}),
      gestores: {
        some: {
          ativo: true,
          dataFim: null,
        },
      },
    },
    include: {
      orgao: true,
      unidadePai: true,
      gestores: {
        where: {
          ativo: true,
          dataFim: null,
        },
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
        orderBy: [
          {
            papel: "asc",
          },
          {
            dataInicio: "desc",
          },
        ],
      },
      _count: {
        select: {
          lotacoes: {
            where: {
              status: "ATIVO",
            },
          },
          unidadesFilhas: true,
        },
      },
    },
    orderBy: [
      {
        orgao: {
          sigla: "asc",
        },
      },
      {
        sigla: "asc",
      },
    ],
  });

  return unidades.map((unidade) => ({
    id: unidade.id,
    orgao: unidade.orgao.sigla,
    sigla: unidade.sigla,
    nome: unidade.nome,
    unidadePai: unidade.unidadePai
      ? `${unidade.unidadePai.sigla} - ${unidade.unidadePai.nome}`
      : "-",
    quantidadeServidores: unidade._count.lotacoes,
    quantidadeUnidadesFilhas: unidade._count.unidadesFilhas,
    chefias: unidade.gestores
      .map((gestor) => {
        const nome = nomeServidor(gestor.servidor) || gestor.servidor.usuario.nome;
        return `${gestor.papel}: ${gestor.servidor.matricula} - ${nome}`;
      })
      .join("; "),
  })) satisfies LinhaLotacaoComChefia[];
}

async function resolverIdsServidoresPermitidos(params: EscopoRelatorioParams) {
  const modo = params.modo ?? "consultar";
  const podeGlobal = possuiPermissao(params.permissoes, modo, "global");
  const podeChefia = possuiPermissao(params.permissoes, modo, "chefia");
  const podeProprio = possuiPermissao(params.permissoes, modo, "proprio");

  if (podeGlobal) {
    const servidores = await prisma.servidor.findMany({
      where: {
        ativo: true,
        usuario: {
          ativo: true,
        },
        ...(params.servidorId ? { id: params.servidorId } : {}),
      },
      select: {
        id: true,
      },
    });

    return {
      ids: servidores.map((servidor) => servidor.id),
      escopo: "global" as const,
    };
  }

  const idsPermitidos = new Set<string>();

  if (podeChefia) {
    const unidades = await listarIdsUnidadesSubordinadasPorUsuario(
      params.usuarioId,
    );

    if (unidades.length > 0) {
      const servidores = await prisma.servidor.findMany({
        where: {
          ativo: true,
          usuario: {
            ativo: true,
          },
          lotacoes: {
            some: {
              status: "ATIVO",
              unidadeId: {
                in: unidades,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

      for (const servidor of servidores) {
        idsPermitidos.add(servidor.id);
      }
    }
  }

  if (podeProprio) {
    const servidorProprio = await buscarServidorProprio(params.usuarioId);

    if (servidorProprio) {
      idsPermitidos.add(servidorProprio.id);
    }
  }

  const ids = Array.from(idsPermitidos).filter(
    (id) => !params.servidorId || id === params.servidorId,
  );

  return {
    ids,
    escopo: podeChefia ? ("chefia" as const) : ("proprio" as const),
  };
}

export async function listarServidoresParaRelatorioGerencial(
  params: EscopoRelatorioParams,
) {
  const escopo = await resolverIdsServidoresPermitidos(params);

  if (escopo.ids.length === 0) {
    return [];
  }

  return prisma.servidor.findMany({
    where: {
      id: {
        in: escopo.ids,
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

export async function buscarDadosRelatorioGerencial(params: {
  tipo: TipoRelatorioGerencial;
  usuarioId: string;
  permissoes: string[];
  ano: number;
  mes: number;
  servidorId?: string | null;
}) {
  const escopo = await resolverIdsServidoresPermitidos({
    usuarioId: params.usuarioId,
    permissoes: params.permissoes,
    servidorId: params.servidorId,
    modo: "exportar",
  });

  if (escopo.ids.length === 0) {
    return {
      tipo: params.tipo,
      ano: params.ano,
      mes: params.mes,
      linhas: [],
      escopo: escopo.escopo,
    } satisfies DadosRelatorioGerencial;
  }

  const inicio = new Date(Date.UTC(params.ano, params.mes - 1, 1));
  const fim = new Date(Date.UTC(params.ano, params.mes, 1));

  const [servidores, apuracoes] = await Promise.all([
    prisma.servidor.findMany({
      where: {
        id: {
          in: escopo.ids,
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
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId: {
          in: escopo.ids,
        },
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
    }),
  ]);

  const linhasPorServidor = new Map<string, LinhaRelatorioGerencial>();

  for (const servidor of servidores) {
    const unidade = servidor.lotacoes[0]?.unidade;

    linhasPorServidor.set(servidor.id, {
      id: servidor.id,
      matricula: servidor.matricula,
      nome: nomeServidor(servidor) || servidor.usuario.nome,
      unidade: unidade ? `${unidade.sigla} - ${unidade.nome}` : "-",
      usuarioId: servidor.usuarioId,
      saldoBancoHorasMinutos: servidor.bancoHorasSaldo?.saldoMinutos ?? 0,
      cargaPrevistaMinutos: 0,
      minutosTrabalhados: 0,
      minutosCredito: 0,
      minutosDebito: 0,
      diasComApuracao: 0,
      diasTrabalhados: 0,
      faltas: 0,
      diasComAtrasoOuSaidaAntecipada: 0,
      inconsistencias: 0,
    });
  }

  for (const apuracao of apuracoes) {
    const linha = linhasPorServidor.get(apuracao.servidorId);

    if (!linha) {
      continue;
    }

    linha.diasComApuracao += 1;
    linha.cargaPrevistaMinutos += apuracao.cargaPrevistaMinutos;
    linha.minutosTrabalhados += apuracao.minutosTrabalhados;
    linha.minutosCredito += apuracao.minutosCredito;
    linha.minutosDebito += apuracao.minutosDebito;

    if (apuracao.minutosTrabalhados > 0) {
      linha.diasTrabalhados += 1;
    }

    const temFalta =
      apuracao.resultado === "FALTA" ||
      apuracao.ocorrencias.some((ocorrencia) => ocorrencia.tipo === "FALTA");
    const temDebito =
      apuracao.resultado === "DEBITO" ||
      apuracao.ocorrencias.some((ocorrencia) => ocorrencia.tipo === "DEBITO");
    const temInconsistencia =
      apuracao.resultado === "INCOMPLETA" ||
      apuracao.ocorrencias.some((ocorrencia) =>
        ["MARCACAO_INCOMPLETA", "INTERVALO_INVALIDO"].includes(
          ocorrencia.tipo,
        ),
      );

    if (temFalta) {
      linha.faltas += 1;
    } else if (temDebito) {
      linha.diasComAtrasoOuSaidaAntecipada += 1;
    }

    if (temInconsistencia) {
      linha.inconsistencias += 1;
    }
  }

  return {
    tipo: params.tipo,
    ano: params.ano,
    mes: params.mes,
    linhas: Array.from(linhasPorServidor.values()),
    escopo: escopo.escopo,
  } satisfies DadosRelatorioGerencial;
}
