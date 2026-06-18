import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
  type CalendarioInstitucionalPrecarregado,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { calcularCargaMensalEsperada } from "@/modules/homologacao/application/services/calcular-carga-mensal-esperada.service";

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

function hojeManaus() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function dataLimiteSaldos(params: {
  anoReferencia: number;
  mesReferencia: number;
  hoje?: Date;
}) {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  const hoje = normalizarDataReferencia(params.hoje ?? hojeManaus());

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

function ajustarApuracaoPorCompensacao(
  apuracao: ApuracaoEspelhoMensal,
): ItemEspelhoMensalCompleto {
  const compensacoes = movimentosCompensacaoCredito(apuracao.movimentoBancoHoras);
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
  };
}

async function preencherDiasDaCompetencia(params: {
  anoReferencia: number;
  mesReferencia: number;
  jornadas: JornadaEspelhoMensal[];
  calendario: CalendarioInstitucionalPrecarregado;
}) {
  const inicio = inicioCompetencia(params.anoReferencia, params.mesReferencia);
  const fim = fimCompetencia(params.anoReferencia, params.mesReferencia);
  const cargaMensal = await calcularCargaMensalEsperada({
    anoReferencia: params.anoReferencia,
    mesReferencia: params.mesReferencia,
    jornadas: params.jornadas,
    calendario: params.calendario,
  });
  const cargaPorData = new Map(
    cargaMensal.dias.map((dia) => [
      chaveData(dia.dataReferencia),
      dia.cargaPrevistaMinutos,
    ]),
  );
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
    );

    dias.push({
      dataReferencia,
      cargaPrevistaMinutos: cargaPorData.get(chaveData(dataReferencia)) ?? 0,
      tipoDiaInstitucional: classificacao.tipo,
      descricaoDiaInstitucional: classificacao.descricao,
      contaComoDiaUtil: classificacao.contaComoDiaUtil,
      geraApuracaoRegular: classificacao.geraApuracaoRegular,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    dias,
    cargaPrevistaMensalMinutos: cargaMensal.cargaPrevistaMinutos,
  };
}

export async function montarEspelhoMensalCompleto(params: {
  anoReferencia: number;
  mesReferencia: number;
  apuracoes: ApuracaoEspelhoMensal[];
  jornadas: JornadaEspelhoMensal[];
  calendario?: CalendarioInstitucionalPrecarregado;
  hoje?: Date;
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
  const { dias, cargaPrevistaMensalMinutos } =
    await preencherDiasDaCompetencia({
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      jornadas: params.jornadas,
      calendario,
    });
  const apuracoesPorData = new Map(
    params.apuracoes.map((apuracao) => [
      chaveData(apuracao.dataReferencia),
      ajustarApuracaoPorCompensacao(apuracao),
    ]),
  );

  const itens = dias.map<ItemEspelhoMensalCompleto>((dia) => {
    const chave = chaveData(dia.dataReferencia);
    const apuracao = apuracoesPorData.get(chave);
    const contabilizarSaldos = dia.dataReferencia <= limiteSaldos;

    if (apuracao) {
      return {
        ...apuracao,
        contabilizarSaldos,
      };
    }

    return {
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
        tipoDiaInstitucional: dia.tipoDiaInstitucional,
        descricaoDiaInstitucional: dia.descricaoDiaInstitucional,
        contaComoDiaUtil: dia.contaComoDiaUtil,
        geraApuracaoRegular: dia.geraApuracaoRegular,
      },
      ocorrencias: [],
      contabilizarSaldos,
      geradoParaCompetencia: true,
      minutosDebitoApurado: 0,
      minutosDebitoCompensado: 0,
    };
  });

  return {
    itens,
    cargaPrevistaMensalMinutos,
  };
}
