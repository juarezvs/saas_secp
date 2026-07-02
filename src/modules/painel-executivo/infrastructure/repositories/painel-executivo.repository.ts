import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export type SerieValor = {
  label: string;
  valor: number;
};

export type SerieDupla = {
  label: string;
  valor: number;
  valorSecundario: number;
};

export type PainelExecutivoDados = {
  competencia: {
    ano: number;
    mes: number;
    valorInput: string;
    rotulo: string;
  };
  metricas: {
    servidoresAtivos: number;
    apuracoesCalculadas: number;
    regularidadePercentual: number;
    ocorrenciasAbertas: number;
    homologacoesPendentes: number;
    homologacoesHomologadas: number;
    saldoBancoHorasHoras: number;
    equipamentosOffline: number;
  };
  apuracaoPorResultado: SerieValor[];
  homologacaoPorStatus: SerieValor[];
  ocorrenciasPorTipo: SerieValor[];
  ocorrenciasPorUnidade: SerieValor[];
  evolucaoDiaria: SerieDupla[];
  bancoHorasPorTipo: SerieValor[];
  maioresSaldosBancoHoras: SerieValor[];
  solicitacoesPorStatus: SerieValor[];
  solicitacoesPorTipo: SerieValor[];
  marcacoesPorFonte: SerieValor[];
  equipamentosPorStatus: SerieValor[];
  eventosEquipamentoPorTipo: SerieValor[];
};

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const RESULTADOS_APURACAO: Record<string, string> = {
  REGULAR: "Regular",
  CREDITO: "Credito",
  DEBITO: "Debito",
  FALTA: "Falta",
  INCOMPLETA: "Incompleta",
  SEM_JORNADA: "Sem jornada",
  SEM_EXPEDIENTE: "Sem expediente",
};

const STATUS_HOMOLOGACAO: Record<string, string> = {
  PENDENTE: "Pendente",
  COM_PENDENCIAS: "Com pendencias",
  HOMOLOGADO: "Homologado",
  HOMOLOGADO_COM_RESSALVA: "Homologado com ressalva",
  DEVOLVIDO: "Devolvido",
};

const OCORRENCIAS: Record<string, string> = {
  MARCACAO_INCOMPLETA: "Marcacao incompleta",
  INTERVALO_INVALIDO: "Intervalo invalido",
  CREDITO: "Credito",
  DEBITO: "Debito",
  FALTA: "Falta",
  SEM_JORNADA: "Sem jornada",
  MARCACAO_DUPLICADA: "Marcacao duplicada",
  HORA_NAO_AUTORIZADA: "Hora nao autorizada",
};

const STATUS_SOLICITACAO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_ANALISE: "Em analise",
  DEFERIDA: "Deferida",
  INDEFERIDA: "Indeferida",
  CANCELADA: "Cancelada",
};

const TIPOS_SOLICITACAO: Record<string, string> = {
  AJUSTE_PONTO: "Ajuste de ponto",
  COMPENSACAO: "Compensacao",
  ABONO_JUSTIFICATIVA: "Abono/justificativa",
  ATIVIDADE_EXTERNA: "Atividade externa",
  VIAGEM_SERVICO: "Viagem a servico",
  CAPACITACAO: "Capacitacao",
  DISPENSA_PONTO: "Dispensa de ponto",
  HORA_CREDITO_PREVIA: "Hora credito previa",
  FOLGA_BANCO_HORAS: "Folga banco de horas",
};

const FONTES_MARCACAO: Record<string, string> = {
  WEB: "Web",
  BIOMETRIA_FACIAL: "Biometria facial",
  EQUIPAMENTO_BIOMETRICO: "Equipamento",
  AFD: "AFD",
  MANUAL_ADMINISTRATIVO: "Manual",
  IMPORTACAO: "Importacao",
};

const TIPOS_BANCO_HORAS: Record<string, string> = {
  CREDITO: "Credito",
  DEBITO: "Debito",
  COMPENSACAO_CREDITO: "Compensacao credito",
  COMPENSACAO_DEBITO: "Compensacao debito",
  HORAS_ACIMA_LIMITE: "Acima do limite",
  HORAS_NAO_AUTORIZADAS: "Nao autorizadas",
  AJUSTE_MANUAL: "Ajuste manual",
  ESTORNO: "Estorno",
};

const TIPOS_EVENTO_EQUIPAMENTO: Record<string, string> = {
  MARCACAO: "Marcacao",
  HEARTBEAT: "Heartbeat",
  SINCRONIZACAO: "Sincronizacao",
  ERRO: "Erro",
};

function competenciaAtual() {
  const hoje = new Date();

  return {
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
  };
}

export function normalizarCompetencia(competencia?: string | null) {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);
  const atual = competenciaAtual();

  if (!match) {
    return atual;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return atual;
  }

  return { ano, mes };
}

function criarPeriodo(competencia?: string | null) {
  const { ano, mes } = normalizarCompetencia(competencia);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();

  return {
    ano,
    mes,
    inicio,
    fim,
    diasNoMes,
    valorInput: `${ano}-${String(mes).padStart(2, "0")}`,
    rotulo: `${MESES[mes - 1]}/${ano}`,
  };
}

function serieComZeros(chaves: Record<string, string>) {
  return Object.values(chaves).map((label) => ({ label, valor: 0 }));
}

function mapearGroupBy(
  grupos: Array<{ _count?: number; _sum?: { minutos?: number | null } }>,
  labels: Record<string, string>,
  campo: "tipo" | "status" | "resultado" | "fonte" | "tipoEvento",
  modo: "count" | "minutos" = "count",
) {
  const valores = new Map<string, number>();

  for (const grupo of grupos) {
    const chave = String((grupo as Record<string, unknown>)[campo] ?? "");
    const label = labels[chave] ?? chave;
    const valor = modo === "minutos" ? (grupo._sum?.minutos ?? 0) : (grupo._count ?? 0);

    valores.set(label, (valores.get(label) ?? 0) + valor);
  }

  const base = serieComZeros(labels).map((item) => ({
    ...item,
    valor: valores.get(item.label) ?? item.valor,
  }));
  const extras = Array.from(valores.entries())
    .filter(([label]) => !base.some((item) => item.label === label))
    .map(([label, valor]) => ({ label, valor }));

  return [...base, ...extras].filter((item) => item.valor > 0);
}

function limitarRanking(itens: SerieValor[], limite = 6) {
  return [...itens].sort((a, b) => b.valor - a.valor).slice(0, limite);
}

function minutosParaHoras(minutos: number) {
  return Math.round((minutos / 60) * 10) / 10;
}

export async function buscarDadosPainelExecutivo(params: {
  competencia?: string | null;
} = {}): Promise<PainelExecutivoDados> {
  const periodo = criarPeriodo(params.competencia);
  const heartbeatLimite = new Date();
  heartbeatLimite.setHours(heartbeatLimite.getHours() - 24);

  const [
    servidoresAtivos,
    apuracoesPorResultadoRaw,
    homologacaoPorStatusRaw,
    ocorrenciasPorTipoRaw,
    ocorrenciasAbertas,
    evolucaoRaw,
    ocorrenciasRaw,
    movimentosBancoRaw,
    saldoBancoTotalRaw,
    saldosBancoRaw,
    solicitacoesPorStatusRaw,
    solicitacoesPorTipoRaw,
    marcacoesPorFonteRaw,
    equipamentos,
    eventosEquipamentoRaw,
  ] = await Promise.all([
    prisma.servidor.count({ where: { ativo: true, usuario: { ativo: true } } }),
    prisma.apuracaoDiaria.groupBy({
      by: ["resultado"],
      where: { dataReferencia: { gte: periodo.inicio, lt: periodo.fim } },
      _count: true,
    }),
    prisma.homologacaoServidorMes.groupBy({
      by: ["status"],
      where: {
        fechamento: {
          anoReferencia: periodo.ano,
          mesReferencia: periodo.mes,
        },
      },
      _count: true,
    }),
    prisma.ocorrenciaFrequencia.groupBy({
      by: ["tipo"],
      where: {
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      _count: true,
    }),
    prisma.ocorrenciaFrequencia.count({
      where: {
        resolvida: false,
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
    }),
    prisma.apuracaoDiaria.groupBy({
      by: ["dataReferencia", "resultado"],
      where: { dataReferencia: { gte: periodo.inicio, lt: periodo.fim } },
      _count: true,
      orderBy: { dataReferencia: "asc" },
    }),
    prisma.ocorrenciaFrequencia.findMany({
      where: {
        apuracaoDiaria: {
          dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        },
      },
      select: {
        servidor: {
          select: {
            lotacoes: {
              where: {
                status: "ATIVO",
                dataInicio: { lt: periodo.fim },
                OR: [{ dataFim: null }, { dataFim: { gte: periodo.inicio } }],
              },
              select: { unidade: { select: { sigla: true, nome: true } } },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.movimentoBancoHoras.groupBy({
      by: ["tipo"],
      where: {
        anoReferencia: periodo.ano,
        mesReferencia: periodo.mes,
      },
      _sum: { minutos: true },
      _count: true,
    }),
    prisma.bancoHorasSaldo.aggregate({
      _sum: { saldoMinutos: true },
    }),
    prisma.bancoHorasSaldo.findMany({
      orderBy: [{ saldoMinutos: "desc" }],
      take: 8,
      include: {
        servidor: {
          include: { usuario: true },
        },
      },
    }),
    prisma.solicitacao.groupBy({
      by: ["status"],
      where: {
        criadoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
    prisma.solicitacao.groupBy({
      by: ["tipo"],
      where: {
        criadoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
    prisma.marcacao.groupBy({
      by: ["fonte"],
      where: {
        dataReferencia: { gte: periodo.inicio, lt: periodo.fim },
        status: "VALIDA",
      },
      _count: true,
    }),
    prisma.equipamentoBiometrico.findMany({
      select: {
        ativo: true,
        ultimoHeartbeatEm: true,
      },
    }),
    prisma.eventoEquipamentoBiometrico.groupBy({
      by: ["tipoEvento"],
      where: {
        recebidoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      _count: true,
    }),
  ]);

  const apuracaoPorResultado = mapearGroupBy(
    apuracoesPorResultadoRaw,
    RESULTADOS_APURACAO,
    "resultado",
  );
  const homologacaoPorStatus = mapearGroupBy(
    homologacaoPorStatusRaw,
    STATUS_HOMOLOGACAO,
    "status",
  );
  const ocorrenciasPorTipo = limitarRanking(
    mapearGroupBy(ocorrenciasPorTipoRaw, OCORRENCIAS, "tipo"),
    8,
  );
  const bancoHorasPorTipo = limitarRanking(
    mapearGroupBy(movimentosBancoRaw, TIPOS_BANCO_HORAS, "tipo", "minutos").map(
      (item) => ({ ...item, valor: minutosParaHoras(item.valor) }),
    ),
    8,
  );

  const porUnidade = new Map<string, number>();
  for (const ocorrencia of ocorrenciasRaw) {
    const unidade = ocorrencia.servidor.lotacoes[0]?.unidade;
    const label = unidade?.sigla ?? unidade?.nome ?? "Sem unidade";
    porUnidade.set(label, (porUnidade.get(label) ?? 0) + 1);
  }

  const regularPorDia = new Map<number, number>();
  const pendenciasPorDia = new Map<number, number>();
  for (const item of evolucaoRaw) {
    const dia = item.dataReferencia.getDate();
    if (item.resultado === "REGULAR") {
      regularPorDia.set(dia, (regularPorDia.get(dia) ?? 0) + item._count);
    } else {
      pendenciasPorDia.set(dia, (pendenciasPorDia.get(dia) ?? 0) + item._count);
    }
  }

  const evolucaoDiaria = Array.from({ length: periodo.diasNoMes }, (_, index) => {
    const dia = index + 1;

    return {
      label: String(dia).padStart(2, "0"),
      valor: regularPorDia.get(dia) ?? 0,
      valorSecundario: pendenciasPorDia.get(dia) ?? 0,
    };
  });

  const homologacoesPendentes = homologacaoPorStatus
    .filter((item) => ["Pendente", "Com pendencias", "Devolvido"].includes(item.label))
    .reduce((total, item) => total + item.valor, 0);
  const homologacoesHomologadas = homologacaoPorStatus
    .filter((item) => item.label.startsWith("Homologado"))
    .reduce((total, item) => total + item.valor, 0);
  const totalApuracoes = apuracaoPorResultado.reduce(
    (total, item) => total + item.valor,
    0,
  );
  const apuracoesRegulares =
    apuracaoPorResultado.find((item) => item.label === "Regular")?.valor ?? 0;
  const regularidadePercentual =
    totalApuracoes > 0 ? Math.round((apuracoesRegulares / totalApuracoes) * 100) : 0;

  const equipamentosPorStatus = [
    {
      label: "Online",
      valor: equipamentos.filter(
        (item) =>
          item.ativo &&
          item.ultimoHeartbeatEm &&
          item.ultimoHeartbeatEm >= heartbeatLimite,
      ).length,
    },
    {
      label: "Offline",
      valor: equipamentos.filter(
        (item) =>
          item.ativo &&
          (!item.ultimoHeartbeatEm || item.ultimoHeartbeatEm < heartbeatLimite),
      ).length,
    },
    {
      label: "Inativo",
      valor: equipamentos.filter((item) => !item.ativo).length,
    },
  ].filter((item) => item.valor > 0);

  return {
    competencia: {
      ano: periodo.ano,
      mes: periodo.mes,
      valorInput: periodo.valorInput,
      rotulo: periodo.rotulo,
    },
    metricas: {
      servidoresAtivos,
      apuracoesCalculadas: totalApuracoes,
      regularidadePercentual,
      ocorrenciasAbertas,
      homologacoesPendentes,
      homologacoesHomologadas,
      saldoBancoHorasHoras: minutosParaHoras(
        saldoBancoTotalRaw._sum.saldoMinutos ?? 0,
      ),
      equipamentosOffline:
        equipamentosPorStatus.find((item) => item.label === "Offline")?.valor ?? 0,
    },
    apuracaoPorResultado,
    homologacaoPorStatus,
    ocorrenciasPorTipo,
    ocorrenciasPorUnidade: limitarRanking(
      Array.from(porUnidade.entries()).map(([label, valor]) => ({ label, valor })),
    ),
    evolucaoDiaria,
    bancoHorasPorTipo,
    maioresSaldosBancoHoras: saldosBancoRaw.map((item) => ({
      label: nomeServidor(item.servidor) || item.servidor.matricula,
      valor: minutosParaHoras(item.saldoMinutos),
    })),
    solicitacoesPorStatus: mapearGroupBy(
      solicitacoesPorStatusRaw,
      STATUS_SOLICITACAO,
      "status",
    ),
    solicitacoesPorTipo: limitarRanking(
      mapearGroupBy(solicitacoesPorTipoRaw, TIPOS_SOLICITACAO, "tipo"),
      8,
    ),
    marcacoesPorFonte: mapearGroupBy(
      marcacoesPorFonteRaw,
      FONTES_MARCACAO,
      "fonte",
    ),
    equipamentosPorStatus,
    eventosEquipamentoPorTipo: mapearGroupBy(
      eventosEquipamentoRaw,
      TIPOS_EVENTO_EQUIPAMENTO,
      "tipoEvento",
    ),
  };
}
