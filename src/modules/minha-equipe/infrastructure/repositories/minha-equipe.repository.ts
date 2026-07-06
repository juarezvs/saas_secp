import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export type StatusPresencaEquipe = "PRESENTE" | "AUSENTE" | "AFASTADO";

export type UnidadeMinhaEquipe = {
  id: string;
  sigla: string;
  nome: string;
  unidadePaiId: string | null;
  nivel: number;
};

export type ServidorMinhaEquipe = {
  id: string;
  matricula: string;
  cpf: string | null;
  nome: string;
  unidadeId: string;
  unidadeSigla: string;
  unidadeNome: string;
  status: StatusPresencaEquipe;
  detalheStatus: string;
  marcacoes: number;
  primeiraMarcacao: Date | null;
  ultimaMarcacao: Date | null;
};

export type MinhaEquipeResumo = {
  total: number;
  presentes: number;
  ausentes: number;
  afastados: number;
};

export type MinhaEquipeDados = {
  escopo: "chefia" | "global";
  unidades: UnidadeMinhaEquipe[];
  unidadesSelecionadas: string[];
  servidores: ServidorMinhaEquipe[];
  resumo: MinhaEquipeResumo;
};

export type StatusFeriasEquipe =
  "PROGRAMADA" | "GOZADA" | "CANCELADA" | "ALTERADA" | "INATIVA";

export type FeriasEquipeItem = {
  id: string;
  servidorId: string;
  matricula: string;
  servidorNome: string;
  unidadeId: string;
  unidadeSigla: string;
  unidadeNome: string;
  dataInicio: Date;
  dataFim: Date;
  dias: number | null;
  exercicio: number | null;
  processo: string | null;
  status: StatusFeriasEquipe;
  statusLabel: string;
};

export type FeriasEquipeResumo = {
  periodos: number;
  servidores: number;
  mesMaisMovimentado: string;
  maiorQuantidadeMes: number;
};

export type FeriasEquipeCalendarioDados = {
  ano: number;
  escopo: "chefia" | "global";
  itens: FeriasEquipeItem[];
  resumo: FeriasEquipeResumo;
};

export async function listarIdsUnidadesSubordinadasNaData(params: {
  usuarioId: string;
  data: Date;
}) {
  const gestores = await prisma.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataInicio: {
        lte: params.data,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
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
    const filhas = await prisma.unidadeOrganizacional.findMany({
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

function calcularNiveisUnidades(
  unidades: Array<{ id: string; unidadePaiId: string | null }>,
) {
  const porId = new Map(unidades.map((unidade) => [unidade.id, unidade]));
  const cache = new Map<string, number>();

  function nivel(unidadeId: string): number {
    const existente = cache.get(unidadeId);

    if (existente !== undefined) {
      return existente;
    }

    const unidade = porId.get(unidadeId);
    const resultado =
      unidade?.unidadePaiId && porId.has(unidade.unidadePaiId)
        ? nivel(unidade.unidadePaiId) + 1
        : 0;

    cache.set(unidadeId, resultado);
    return resultado;
  }

  return new Map(unidades.map((unidade) => [unidade.id, nivel(unidade.id)]));
}

function formatarHora(data: Date | null) {
  if (!data) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function filtroFeriasSarh() {
  return {
    OR: [
      { categoria: { equals: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          is: {
            OR: [
              { categoria: { equals: "FERIAS", mode: "insensitive" as const } },
              {
                descricao: { contains: "FERIAS", mode: "insensitive" as const },
              },
            ],
          },
        },
      },
    ],
  };
}

function inicioAnoUtc(ano: number) {
  return new Date(Date.UTC(ano, 0, 1));
}

function inicioProximoAnoUtc(ano: number) {
  return new Date(Date.UTC(ano + 1, 0, 1));
}

function contarFeriasPorMes(itens: FeriasEquipeItem[], ano: number) {
  return Array.from({ length: 12 }, (_, mes) => {
    const inicioMes = new Date(Date.UTC(ano, mes, 1));
    const inicioMesSeguinte = new Date(Date.UTC(ano, mes + 1, 1));

    return itens.filter(
      (item) =>
        item.dataInicio < inicioMesSeguinte && item.dataFim >= inicioMes,
    ).length;
  });
}

function nomeMes(indice: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, indice, 1)));
}

function classificarStatusFerias(params: {
  ativo: boolean;
  tipoCodigo: string | null;
  observacao: string | null;
  dataFim: Date | null;
  hoje?: Date;
}): { status: StatusFeriasEquipe; statusLabel: string } {
  const tipoCodigo = params.tipoCodigo?.trim();
  const observacao = params.observacao
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  const fim = params.dataFim;
  const hoje = params.hoje ?? new Date();
  const hojeUtc = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  const fimUtc = fim
    ? Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate())
    : null;

  if (
    observacao?.includes("CANCEL") ||
    observacao?.includes("ANUL") ||
    tipoCodigo === "4"
  ) {
    return { status: "CANCELADA", statusLabel: "Cancelada/alterada" };
  }

  if (observacao?.includes("ALTER")) {
    return { status: "ALTERADA", statusLabel: "Alterada" };
  }

  if (tipoCodigo === "2" || (fimUtc !== null && fimUtc < hojeUtc)) {
    return { status: "GOZADA", statusLabel: "Gozada" };
  }

  if (tipoCodigo === "1" || params.ativo) {
    return { status: "PROGRAMADA", statusLabel: "Programada" };
  }

  return { status: "INATIVA", statusLabel: "Inativa" };
}

export async function buscarMinhaEquipe(params: {
  usuarioId: string;
  data: Date;
  unidadeIds?: string[];
  visualizarTodasEquipes?: boolean;
  idsSubordinados?: string[];
}): Promise<MinhaEquipeDados> {
  const escopo = params.visualizarTodasEquipes ? "global" : "chefia";
  const idsSubordinados = params.visualizarTodasEquipes
    ? []
    : (params.idsSubordinados ??
      (await listarIdsUnidadesSubordinadasNaData({
        usuarioId: params.usuarioId,
        data: params.data,
      })));

  if (!params.visualizarTodasEquipes && idsSubordinados.length === 0) {
    return {
      escopo,
      unidades: [],
      unidadesSelecionadas: [],
      servidores: [],
      resumo: { total: 0, presentes: 0, ausentes: 0, afastados: 0 },
    };
  }

  const unidadesBase = await prisma.unidadeOrganizacional.findMany({
    where: params.visualizarTodasEquipes
      ? { ativo: true }
      : {
          id: { in: idsSubordinados },
          ativo: true,
        },
    select: {
      id: true,
      sigla: true,
      nome: true,
      unidadePaiId: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });
  const niveis = calcularNiveisUnidades(unidadesBase);
  const unidades = unidadesBase.map((unidade) => ({
    ...unidade,
    nivel: niveis.get(unidade.id) ?? 0,
  }));
  const idsValidos = new Set(unidades.map((unidade) => unidade.id));
  const unidadesSelecionadas = (params.unidadeIds ?? []).filter((id) =>
    idsValidos.has(id),
  );
  const idsFiltro =
    unidadesSelecionadas.length > 0
      ? unidadesSelecionadas
      : Array.from(idsValidos);
  const chefia = params.visualizarTodasEquipes
    ? null
    : await prisma.servidor.findUnique({
        where: { usuarioId: params.usuarioId },
        select: { id: true },
      });

  const servidores = await prisma.servidor.findMany({
    where: {
      ativo: true,
      ...(chefia ? { id: { not: chefia.id } } : {}),
      usuario: { ativo: true },
      lotacoes: {
        some: {
          status: "ATIVO",
          unidadeId: { in: idsFiltro },
          dataInicio: { lte: params.data },
          OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
        },
      },
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
          unidadeId: { in: idsFiltro },
          dataInicio: { lte: params.data },
          OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
        },
        include: {
          unidade: true,
        },
        orderBy: [{ dataInicio: "desc" }],
      },
    },
    orderBy: [{ nomeFuncional: "asc" }, { matricula: "asc" }],
  });
  const servidorIds = servidores.map((servidor) => servidor.id);

  if (servidorIds.length === 0) {
    return {
      escopo,
      unidades,
      unidadesSelecionadas,
      servidores: [],
      resumo: { total: 0, presentes: 0, ausentes: 0, afastados: 0 },
    };
  }

  const [marcacoes, apuracoes, afastamentos] = await Promise.all([
    prisma.marcacao.findMany({
      where: {
        servidorId: { in: servidorIds },
        dataReferencia: params.data,
        status: "VALIDA",
      },
      select: {
        servidorId: true,
        dataHora: true,
      },
      orderBy: { dataHora: "asc" },
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId: { in: servidorIds },
        dataReferencia: params.data,
      },
      select: {
        servidorId: true,
        resultado: true,
        minutosTrabalhados: true,
      },
    }),
    prisma.afastamentoSarh.findMany({
      where: {
        servidorId: { in: servidorIds },
        ativo: true,
        dataInicio: { lte: params.data },
        OR: [{ dataFim: null }, { dataFim: { gte: params.data } }],
      },
      select: {
        servidorId: true,
        tipoDescricao: true,
        categoria: true,
        dataFim: true,
      },
    }),
  ]);

  const marcacoesPorServidor = new Map<string, Date[]>();
  for (const marcacao of marcacoes) {
    const lista = marcacoesPorServidor.get(marcacao.servidorId) ?? [];
    lista.push(marcacao.dataHora);
    marcacoesPorServidor.set(marcacao.servidorId, lista);
  }

  const apuracaoPorServidor = new Map(
    apuracoes.map((apuracao) => [apuracao.servidorId, apuracao]),
  );
  const afastamentoPorServidor = new Map(
    afastamentos.map((afastamento) => [
      afastamento.servidorId ?? "",
      afastamento,
    ]),
  );

  const itens = servidores.map((servidor): ServidorMinhaEquipe => {
    const lotacao = servidor.lotacoes[0];
    const marcacoesServidor = marcacoesPorServidor.get(servidor.id) ?? [];
    const apuracao = apuracaoPorServidor.get(servidor.id);
    const afastamento = afastamentoPorServidor.get(servidor.id);
    const primeiraMarcacao = marcacoesServidor[0] ?? null;
    const ultimaMarcacao =
      marcacoesServidor.length > 0
        ? marcacoesServidor[marcacoesServidor.length - 1]
        : null;
    const temPresenca =
      marcacoesServidor.length > 0 ||
      Number(apuracao?.minutosTrabalhados ?? 0) > 0;
    const status: StatusPresencaEquipe = afastamento
      ? "AFASTADO"
      : temPresenca
        ? "PRESENTE"
        : "AUSENTE";
    const detalheStatus = afastamento
      ? (afastamento.tipoDescricao ?? afastamento.categoria)
      : temPresenca
        ? [
            marcacoesServidor.length
              ? `${marcacoesServidor.length} marcação(ões)`
              : "Apuração com presença",
            primeiraMarcacao && ultimaMarcacao
              ? `${formatarHora(primeiraMarcacao)} - ${formatarHora(ultimaMarcacao)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : apuracao?.resultado === "FALTA"
          ? "Falta registrada na apuração"
          : "Sem marcação válida no dia";

    return {
      id: servidor.id,
      matricula: servidor.matricula,
      cpf: servidor.cpf,
      nome: nomeServidor(servidor) || servidor.matricula,
      unidadeId: lotacao?.unidadeId ?? "",
      unidadeSigla: lotacao?.unidade.sigla ?? "-",
      unidadeNome: lotacao?.unidade.nome ?? "-",
      status,
      detalheStatus,
      marcacoes: marcacoesServidor.length,
      primeiraMarcacao,
      ultimaMarcacao,
    };
  });

  itens.sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );

  return {
    escopo,
    unidades,
    unidadesSelecionadas,
    servidores: itens,
    resumo: {
      total: itens.length,
      presentes: itens.filter((item) => item.status === "PRESENTE").length,
      ausentes: itens.filter((item) => item.status === "AUSENTE").length,
      afastados: itens.filter((item) => item.status === "AFASTADO").length,
    },
  };
}

export async function buscarCalendarioFeriasEquipe(params: {
  usuarioId: string;
  ano: number;
  dataReferencia?: Date;
  unidadeIds?: string[];
  visualizarTodasEquipes?: boolean;
  idsSubordinados?: string[];
}): Promise<FeriasEquipeCalendarioDados> {
  const escopo = params.visualizarTodasEquipes ? "global" : "chefia";
  const inicioAno = inicioAnoUtc(params.ano);
  const inicioProximoAno = inicioProximoAnoUtc(params.ano);
  const dataEscopo = params.dataReferencia ?? new Date();
  const idsSubordinados = params.visualizarTodasEquipes
    ? []
    : (params.idsSubordinados ??
      (await listarIdsUnidadesSubordinadasNaData({
        usuarioId: params.usuarioId,
        data: dataEscopo,
      })));

  if (!params.visualizarTodasEquipes && idsSubordinados.length === 0) {
    return {
      ano: params.ano,
      escopo,
      itens: [],
      resumo: {
        periodos: 0,
        servidores: 0,
        mesMaisMovimentado: "-",
        maiorQuantidadeMes: 0,
      },
    };
  }

  const unidadesBase = await prisma.unidadeOrganizacional.findMany({
    where: params.visualizarTodasEquipes
      ? { ativo: true }
      : {
          id: { in: idsSubordinados },
          ativo: true,
        },
    select: { id: true },
  });
  const idsValidos = new Set(unidadesBase.map((unidade) => unidade.id));
  const unidadesSelecionadas = (params.unidadeIds ?? []).filter((id) =>
    idsValidos.has(id),
  );
  const idsFiltro =
    unidadesSelecionadas.length > 0
      ? unidadesSelecionadas
      : Array.from(idsValidos);
  if (idsFiltro.length === 0) {
    return {
      ano: params.ano,
      escopo,
      itens: [],
      resumo: {
        periodos: 0,
        servidores: 0,
        mesMaisMovimentado: "-",
        maiorQuantidadeMes: 0,
      },
    };
  }

  const lotacaoNoPeriodo = {
    status: "ATIVO" as const,
    unidadeId: { in: idsFiltro },
    dataInicio: { lt: inicioProximoAno },
    OR: [{ dataFim: null }, { dataFim: { gte: inicioAno } }],
  };

  const afastamentos = await prisma.afastamentoSarh.findMany({
    where: {
      servidorId: { not: null },
      dataInicio: { lt: inicioProximoAno },
      AND: [
        { OR: [{ dataFim: null }, { dataFim: { gte: inicioAno } }] },
        filtroFeriasSarh(),
      ],
      servidor: {
        ativo: true,
        usuario: { ativo: true },
        lotacoes: {
          some: lotacaoNoPeriodo,
        },
      },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: lotacaoNoPeriodo,
            include: {
              unidade: true,
            },
            orderBy: [{ dataInicio: "desc" }],
          },
        },
      },
    },
    orderBy: [{ dataInicio: "asc" }, { dataFim: "asc" }],
  });

  const itens = afastamentos
    .map((afastamento): FeriasEquipeItem | null => {
      const servidor = afastamento.servidor;
      const lotacao = servidor?.lotacoes[0];

      if (!servidor || !lotacao) {
        return null;
      }
      const status = classificarStatusFerias({
        ativo: afastamento.ativo,
        tipoCodigo: afastamento.tipoCodigo,
        observacao: afastamento.observacao,
        dataFim: afastamento.dataFim,
      });

      return {
        id: afastamento.id,
        servidorId: servidor.id,
        matricula: servidor.matricula,
        servidorNome: nomeServidor(servidor) || servidor.matricula,
        unidadeId: lotacao.unidadeId,
        unidadeSigla: lotacao.unidade.sigla,
        unidadeNome: lotacao.unidade.nome,
        dataInicio: afastamento.dataInicio,
        dataFim: afastamento.dataFim ?? afastamento.dataInicio,
        dias: afastamento.dias,
        exercicio: afastamento.exercicio,
        processo: afastamento.processo,
        status: status.status,
        statusLabel: status.statusLabel,
      };
    })
    .filter((item): item is FeriasEquipeItem => Boolean(item));

  const contagemMeses = contarFeriasPorMes(itens, params.ano);
  const maiorQuantidadeMes = Math.max(0, ...contagemMeses);
  const indiceMesMaisMovimentado = contagemMeses.findIndex(
    (quantidade) => quantidade === maiorQuantidadeMes,
  );

  return {
    ano: params.ano,
    escopo,
    itens,
    resumo: {
      periodos: itens.length,
      servidores: new Set(itens.map((item) => item.servidorId)).size,
      mesMaisMovimentado:
        maiorQuantidadeMes > 0 ? nomeMes(indiceMesMaisMovimentado) : "-",
      maiorQuantidadeMes,
    },
  };
}
