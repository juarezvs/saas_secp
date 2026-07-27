import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
  type CalendarioInstitucionalPrecarregado,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { calcularCargaPrevistaComJanela } from "@/modules/apuracao/application/services/expediente.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { normalizarDataReferencia } from "./calcular-tempo.service";

type JornadaEspelhoMensal = {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  jornada: {
    cargaDiariaMinutos: number;
  };
};

type MovimentoBancoHorasEspelho = {
  tipo: string;
  status: string;
  minutos: number;
  autorizacaoBancoHoras?: {
    solicitacao?: {
      id: string;
      tipo: string;
      titulo: string;
    } | null;
  } | null;
};

type OcorrenciaEspelhoMensal = {
  tipo: string;
  descricao: string;
  minutos: number;
  detalhes?: unknown;
};

type AfastamentoSarhEspelho = {
  id: string;
  categoria: string;
  tipoCodigo: string | null;
  tipoDescricao: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  processo: string | null;
  observacao: string | null;
  origemTabela: string;
  ativo: boolean;
  payloadSarh: unknown;
};

type ApuracaoEspelhoMensal = {
  id: string;
  dataReferencia: Date;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosIntervalo: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
  primeiraEntrada?: Date | null;
  saidaIntervalo?: Date | null;
  retornoIntervalo?: Date | null;
  ultimaSaida?: Date | null;
  metadados?: unknown;
  ocorrencias?: OcorrenciaEspelhoMensal[];
  movimentoBancoHoras?: MovimentoBancoHorasEspelho[];
};

export type ItemEspelhoMensalCompleto = Omit<
  ApuracaoEspelhoMensal,
  "movimentoBancoHoras"
> & {
  contabilizarSaldos: boolean;
  geradoParaCompetencia: boolean;
  minutosDebitoApurado: number;
  minutosDebitoCompensado: number;
  minutosHoraExtraAutorizada: number;
  minutosHoraExtraNaoAutorizada: number;
  minutosBancoHoras: number;
};

export type ResultadoEspelhoMensalCompleto = {
  itens: ItemEspelhoMensalCompleto[];
  cargaPrevistaMensalMinutos: number;
};

function inicioCompetencia(anoReferencia: number, mesReferencia: number) {
  return new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
}

function fimCompetencia(anoReferencia: number, mesReferencia: number) {
  return new Date(Date.UTC(anoReferencia, mesReferencia, 1));
}

function chaveData(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function hojeNoFuso(fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFusoHorario(fusoHorario),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function minutosAgoraNoFuso(fusoHorario?: string | null, agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFusoHorario(fusoHorario),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const hora = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value);

  return hora * 60 + minuto;
}

function minutosLocais(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFusoHorario(fusoHorario),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const hora = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value);

  return hora * 60 + minuto;
}

function horaParaMinutos(hora?: string | null) {
  const match = hora?.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function dataLimiteSaldos(params: {
  anoReferencia: number;
  mesReferencia: number;
  hoje?: Date;
  fusoHorario?: string | null;
}) {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  const hoje = normalizarDataReferencia(
    params.hoje ?? hojeNoFuso(params.fusoHorario),
  );

  if (hoje < inicio) {
    return new Date(inicio.getTime() - 1);
  }

  if (hoje >= fim) {
    return new Date(fim.getTime() - 1);
  }

  return hoje;
}

function metadadosComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return metadados as Record<string, unknown>;
}

function solicitacoesAplicadasComoArray(metadados: unknown) {
  const valor = metadadosComoObjeto(metadados).solicitacoesAplicadas;

  return Array.isArray(valor) ? valor : [];
}

function movimentosCompensacaoCredito(
  movimentos: MovimentoBancoHorasEspelho[] | undefined,
) {
  return (movimentos ?? []).filter(
    (movimento) =>
      movimento.tipo === "COMPENSACAO_CREDITO" &&
      ["PENDENTE", "VALIDADO"].includes(movimento.status),
  );
}

function extrairJanelaExpediente(metadados: unknown) {
  const janela = metadadosComoObjeto(metadados).janelaExpediente;

  if (!janela || typeof janela !== "object" || Array.isArray(janela)) {
    return null;
  }

  const dados = janela as { inicio?: unknown; fim?: unknown };

  return {
    inicio: typeof dados.inicio === "string" ? dados.inicio : null,
    fim: typeof dados.fim === "string" ? dados.fim : null,
  };
}

function ajustarDiaAtualEmAndamento(
  item: ItemEspelhoMensalCompleto,
  params: {
    hoje: Date;
    agora?: Date;
    fusoHorario?: string | null;
  },
) {
  if (
    item.cargaPrevistaMinutos <= 0 ||
    chaveData(item.dataReferencia) !== chaveData(params.hoje) ||
    !["FALTA", "INCOMPLETA", "DEBITO", "PENDENTE"].includes(item.resultado)
  ) {
    return item;
  }

  const janela = extrairJanelaExpediente(item.metadados);
  const inicioJanela = horaParaMinutos(janela?.inicio) ?? 8 * 60;
  const fimJanela = horaParaMinutos(janela?.fim) ?? 18 * 60;
  const inicioPrevisto = item.primeiraEntrada
    ? minutosLocais(item.primeiraEntrada, params.fusoHorario)
    : inicioJanela;
  const saidaPrevista = Math.min(
    fimJanela,
    inicioPrevisto + item.cargaPrevistaMinutos,
  );
  const agora = minutosAgoraNoFuso(params.fusoHorario, params.agora);

  if (agora >= saidaPrevista) {
    return item;
  }

  const minutosTrabalhadosParciais = item.primeiraEntrada
    ? Math.max(0, Math.min(agora - inicioPrevisto, item.cargaPrevistaMinutos))
    : 0;

  return {
    ...item,
    minutosTrabalhados: minutosTrabalhadosParciais,
    minutosCredito: 0,
    minutosDebito: 0,
    resultado: "PENDENTE",
    status: "PENDENTE",
    ocorrencias: (item.ocorrencias ?? []).filter(
      (ocorrencia) =>
        !["MARCACAO_INCOMPLETA", "FALTA", "DEBITO"].includes(ocorrencia.tipo),
    ),
    minutosDebitoApurado: 0,
    minutosDebitoCompensado: 0,
    minutosHoraExtraAutorizada: 0,
    minutosHoraExtraNaoAutorizada: 0,
    minutosBancoHoras: 0,
  };
}

function resumirMovimentosBancoHoras(
  movimentos: MovimentoBancoHorasEspelho[] | undefined,
) {
  const movimentosAtivos = (movimentos ?? []).filter((movimento) =>
    ["PENDENTE", "VALIDADO", "DESCONSIDERADO"].includes(movimento.status),
  );
  const creditoBanco = movimentosAtivos
    .filter(
      (movimento) =>
        ["CREDITO", "COMPENSACAO_DEBITO"].includes(movimento.tipo) &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status),
    )
    .reduce((total, movimento) => total + movimento.minutos, 0);
  const debitoBanco = movimentosAtivos
    .filter(
      (movimento) =>
        ["DEBITO", "COMPENSACAO_CREDITO"].includes(movimento.tipo) &&
        ["PENDENTE", "VALIDADO"].includes(movimento.status),
    )
    .reduce((total, movimento) => total + movimento.minutos, 0);

  return {
    minutosHoraExtraAutorizada: creditoBanco,
    minutosHoraExtraNaoAutorizada: movimentosAtivos
      .filter(
        (movimento) =>
          movimento.tipo === "HORAS_NAO_AUTORIZADAS" &&
          movimento.status === "DESCONSIDERADO",
      )
      .reduce((total, movimento) => total + movimento.minutos, 0),
    minutosBancoHoras: creditoBanco - debitoBanco,
  };
}

function ajustarApuracaoPorCompensacao(
  apuracao: ApuracaoEspelhoMensal,
): ItemEspelhoMensalCompleto {
  const compensacoes = movimentosCompensacaoCredito(
    apuracao.movimentoBancoHoras,
  );
  const resumoBancoHoras = resumirMovimentosBancoHoras(
    apuracao.movimentoBancoHoras,
  );
  const minutosDebitoCompensado = Math.min(
    apuracao.minutosDebito,
    compensacoes.reduce((total, movimento) => total + movimento.minutos, 0),
  );
  const minutosDebitoLiquido = Math.max(
    0,
    apuracao.minutosDebito - minutosDebitoCompensado,
  );
  const compensacoesAplicadas = compensacoes.map((movimento, index) => {
    const solicitacao = movimento.autorizacaoBancoHoras?.solicitacao;

    return {
      id: solicitacao?.id ?? `${apuracao.id}-compensacao-${index}`,
      tipo: "COMPENSACAO",
      titulo: solicitacao?.titulo ?? "Compensacao deferida",
      minutosCobertos: movimento.minutos,
      coberturaIntegral: minutosDebitoLiquido === 0,
      trabalhoRemoto: false,
    };
  });
  const metadados = {
    ...metadadosComoObjeto(apuracao.metadados),
    solicitacoesAplicadas: [
      ...solicitacoesAplicadasComoArray(apuracao.metadados),
      ...compensacoesAplicadas,
    ],
    compensacaoBancoHoras: {
      minutosDebitoApurado: apuracao.minutosDebito,
      minutosDebitoCompensado,
      minutosDebitoLiquido,
    },
  };
  const ocorrencias =
    minutosDebitoCompensado > 0 && minutosDebitoLiquido === 0
      ? (apuracao.ocorrencias ?? []).filter(
          (ocorrencia) => !["DEBITO", "FALTA"].includes(ocorrencia.tipo),
        )
      : (apuracao.ocorrencias ?? []);

  return {
    ...apuracao,
    minutosDebito: minutosDebitoLiquido,
    resultado:
      minutosDebitoCompensado > 0 && minutosDebitoLiquido === 0
        ? apuracao.minutosCredito > 0
          ? "CREDITO"
          : "REGULAR"
        : apuracao.resultado,
    status:
      minutosDebitoCompensado > 0 &&
      minutosDebitoLiquido === 0 &&
      ocorrencias.length === 0
        ? "CALCULADA"
        : apuracao.status,
    metadados,
    ocorrencias,
    contabilizarSaldos: true,
    geradoParaCompetencia: false,
    minutosDebitoApurado: apuracao.minutosDebito,
    minutosDebitoCompensado,
    ...resumoBancoHoras,
  };
}

function jornadaVigenteNoDia(
  jornadas: JornadaEspelhoMensal[],
  dataReferencia: Date,
) {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);

  return jornadas
    .filter((jornada) => {
      const inicio = normalizarDataReferencia(jornada.dataInicio);
      const fim = jornada.dataFim
        ? normalizarDataReferencia(jornada.dataFim)
        : null;

      return inicio <= dataNormalizada && (!fim || fim >= dataNormalizada);
    })
    .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime())[0];
}

async function preencherDiasDaCompetencia(params: {
  anoReferencia: number;
  mesReferencia: number;
  jornadas: JornadaEspelhoMensal[];
  calendario: CalendarioInstitucionalPrecarregado;
  servidorId?: string | null;
}) {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  let cargaPrevistaMensalMinutos = 0;
  const dias: Array<{
    dataReferencia: Date;
    cargaPrevistaMinutos: number;
    tipoDiaInstitucional: string;
    descricaoDiaInstitucional: string | null;
    contaComoDiaUtil: boolean;
    geraApuracaoRegular: boolean;
  }> = [];
  const cursor = new Date(inicio);

  while (cursor < fim) {
    const dataReferencia = normalizarDataReferencia(cursor);
    const classificacao = await classificarDiaInstitucional(
      dataReferencia,
      params.calendario,
      params.servidorId,
    );
    const jornada =
      classificacao.contaComoDiaUtil && classificacao.geraApuracaoRegular
        ? jornadaVigenteNoDia(params.jornadas, dataReferencia)
        : null;
    const cargaPrevistaMinutos = jornada
      ? calcularCargaPrevistaComJanela(
          jornada.jornada.cargaDiariaMinutos,
          classificacao.janelaInicio && classificacao.janelaFim
            ? {
                inicio: classificacao.janelaInicio,
                fim: classificacao.janelaFim,
              }
            : null,
        )
      : 0;

    cargaPrevistaMensalMinutos += cargaPrevistaMinutos;

    dias.push({
      dataReferencia,
      cargaPrevistaMinutos,
      tipoDiaInstitucional: classificacao.tipo,
      descricaoDiaInstitucional: classificacao.descricao,
      contaComoDiaUtil: classificacao.contaComoDiaUtil,
      geraApuracaoRegular: classificacao.geraApuracaoRegular,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    dias,
    cargaPrevistaMensalMinutos,
  };
}

function metadadosDiaInstitucional(dia: {
  tipoDiaInstitucional: string;
  descricaoDiaInstitucional: string | null;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
}) {
  return {
    tipoDiaInstitucional: dia.tipoDiaInstitucional,
    descricaoDiaInstitucional: dia.descricaoDiaInstitucional,
    contaComoDiaUtil: dia.contaComoDiaUtil,
    geraApuracaoRegular: dia.geraApuracaoRegular,
  };
}

async function carregarAfastamentosSarhPeriodo(params: {
  servidorId?: string | null;
  inicio: Date;
  fim: Date;
}) {
  if (!params.servidorId) {
    return [];
  }

  return prisma.afastamentoSarh.findMany({
    where: {
      servidorId: params.servidorId,
      dataInicio: { lt: params.fim },
      OR: [{ dataFim: null }, { dataFim: { gte: params.inicio } }],
    },
    select: {
      id: true,
      categoria: true,
      tipoCodigo: true,
      tipoDescricao: true,
      dataInicio: true,
      dataFim: true,
      processo: true,
      observacao: true,
      origemTabela: true,
      ativo: true,
      payloadSarh: true,
    },
    orderBy: [{ dataInicio: "asc" }, { categoria: "asc" }],
  });
}

function afastamentoAbrangeData(
  afastamento: AfastamentoSarhEspelho,
  dataReferencia: Date,
) {
  const data = normalizarDataReferencia(dataReferencia);
  const inicio = normalizarDataReferencia(afastamento.dataInicio);
  const fim = afastamento.dataFim
    ? normalizarDataReferencia(afastamento.dataFim)
    : null;

  return data >= inicio && (!fim || data <= fim);
}

function descricaoAfastamento(afastamento: AfastamentoSarhEspelho) {
  const tipo = afastamento.tipoDescricao ?? afastamento.categoria;
  const processo = afastamento.processo
    ? ` Processo/SEI: ${afastamento.processo}.`
    : "";

  return `Afastamento SARH: ${tipo}.${processo}`;
}

function afastamentoEhFerias(afastamento: AfastamentoSarhEspelho) {
  return [
    afastamento.categoria,
    afastamento.tipoDescricao,
    afastamento.origemTabela,
  ]
    .filter((valor): valor is string => Boolean(valor))
    .some((valor) =>
      valor
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toUpperCase()
        .includes("FERIAS"),
    );
}

function detalhesAfastamento(
  afastamento: AfastamentoSarhEspelho,
  dataReferencia: Date,
) {
  return {
    id: afastamento.id,
    categoria: afastamento.categoria,
    tipoCodigo: afastamento.tipoCodigo,
    tipoDescricao: afastamento.tipoDescricao,
    dataInicio: afastamento.dataInicio.toISOString(),
    dataFim: afastamento.dataFim?.toISOString() ?? null,
    processo: afastamento.processo,
    observacao: afastamento.observacao,
    origemTabela: afastamento.origemTabela,
    ativo: afastamento.ativo,
    ehFerias: afastamentoEhFerias(afastamento),
    dataReferencia: dataReferencia.toISOString(),
  };
}

function aplicarAfastamentoSarh(
  item: ItemEspelhoMensalCompleto,
  afastamento: AfastamentoSarhEspelho,
): ItemEspelhoMensalCompleto {
  return {
    ...item,
    cargaPrevistaMinutos: 0,
    minutosCredito: 0,
    minutosDebito: 0,
    resultado: "REGULAR",
    status: "CALCULADA",
    metadados: {
      ...metadadosComoObjeto(item.metadados),
      afastamentoSarh: {
        id: afastamento.id,
        categoria: afastamento.categoria,
        tipoCodigo: afastamento.tipoCodigo,
        tipoDescricao: afastamento.tipoDescricao,
        dataInicio: afastamento.dataInicio.toISOString(),
        dataFim: afastamento.dataFim?.toISOString() ?? null,
        processo: afastamento.processo,
        observacao: afastamento.observacao,
        origemTabela: afastamento.origemTabela,
        ativo: afastamento.ativo,
      },
    },
    ocorrencias: [
      ...(item.ocorrencias ?? []).filter(
        (ocorrencia) => !["DEBITO", "FALTA"].includes(ocorrencia.tipo),
      ),
      {
        tipo: "AFASTAMENTO",
        descricao: descricaoAfastamento(afastamento),
        minutos: item.cargaPrevistaMinutos,
        detalhes: detalhesAfastamento(afastamento, item.dataReferencia),
      },
    ],
    minutosDebitoApurado: 0,
    minutosDebitoCompensado: 0,
    minutosHoraExtraAutorizada: 0,
    minutosHoraExtraNaoAutorizada: 0,
    minutosBancoHoras: 0,
  };
}

export async function montarEspelhoMensalCompleto(params: {
  anoReferencia: number;
  mesReferencia: number;
  apuracoes: ApuracaoEspelhoMensal[];
  jornadas: JornadaEspelhoMensal[];
  calendario?: CalendarioInstitucionalPrecarregado;
  servidorId?: string | null;
  hoje?: Date;
  fusoHorario?: string | null;
}): Promise<ResultadoEspelhoMensalCompleto> {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  const calendario =
    params.calendario ??
    (await carregarCalendarioInstitucionalPeriodo({
      inicio,
      fimExclusivo: fim,
    }));
  const limiteSaldos = dataLimiteSaldos(params);
  const { dias } = await preencherDiasDaCompetencia({
    anoReferencia: params.anoReferencia,
    mesReferencia: params.mesReferencia,
    jornadas: params.jornadas,
    calendario,
    servidorId: params.servidorId,
  });
  const afastamentos = await carregarAfastamentosSarhPeriodo({
    servidorId: params.servidorId,
    inicio,
    fim,
  });
  const apuracoesPorData = new Map(
    params.apuracoes.map((apuracao) => [
      chaveData(apuracao.dataReferencia),
      ajustarApuracaoPorCompensacao(apuracao),
    ]),
  );
  const hoje = normalizarDataReferencia(
    params.hoje ?? hojeNoFuso(params.fusoHorario),
  );

  const itens = dias.map<ItemEspelhoMensalCompleto>((dia) => {
    const chave = chaveData(dia.dataReferencia);
    const apuracao = apuracoesPorData.get(chave);
    const contabilizarSaldos = dia.dataReferencia <= limiteSaldos;
    const afastamento = afastamentos.find((item) =>
      afastamentoAbrangeData(item, dia.dataReferencia),
    );

    if (apuracao) {
      const item = {
        ...apuracao,
        metadados: {
          ...metadadosDiaInstitucional(dia),
          ...metadadosComoObjeto(apuracao.metadados),
        },
        contabilizarSaldos,
        geradoParaCompetencia: false,
      };

      return ajustarDiaAtualEmAndamento(
        afastamento ? aplicarAfastamentoSarh(item, afastamento) : item,
        {
          hoje,
          agora: params.hoje,
          fusoHorario: params.fusoHorario,
        },
      );
    }

    const item = {
      id: `competencia-${chave}`,
      dataReferencia: dia.dataReferencia,
      cargaPrevistaMinutos: dia.cargaPrevistaMinutos,
      minutosTrabalhados: 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: 0,
      resultado: dia.geraApuracaoRegular ? "PENDENTE" : "SEM_EXPEDIENTE",
      status: dia.geraApuracaoRegular ? "PENDENTE" : "CALCULADA",
      metadados: {
        origem: "ESPELHO_COMPETENCIA_COMPLETA",
        ...metadadosDiaInstitucional(dia),
      },
      ocorrencias: [],
      contabilizarSaldos,
      geradoParaCompetencia: true,
      minutosDebitoApurado: 0,
      minutosDebitoCompensado: 0,
      minutosHoraExtraAutorizada: 0,
      minutosHoraExtraNaoAutorizada: 0,
      minutosBancoHoras: 0,
    };

    return ajustarDiaAtualEmAndamento(
      afastamento ? aplicarAfastamentoSarh(item, afastamento) : item,
      {
        hoje,
        agora: params.hoje,
        fusoHorario: params.fusoHorario,
      },
    );
  });

  return {
    itens,
    cargaPrevistaMensalMinutos: itens.reduce(
      (total, item) => total + item.cargaPrevistaMinutos,
      0,
    ),
  };
}
