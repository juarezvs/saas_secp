import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import {
  buscarEventoCalendarioInstitucionalPorData,
  listarEventosCalendarioInstitucionalNoPeriodo,
} from "../../infrastructure/repositories/calendario-institucional.repository";
import { listarRecessosForensesNoPeriodo } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";

type EventoCalendarioInstitucionalLite = Awaited<
  ReturnType<typeof buscarEventoCalendarioInstitucionalPorData>
>;

type RecessoForenseLite = Awaited<
  ReturnType<typeof listarRecessosForensesNoPeriodo>
>[number];

export type TipoDiaInstitucional =
  | "UTIL"
  | "SABADO"
  | "DOMINGO"
  | "FERIADO"
  | "PONTO_FACULTATIVO"
  | "SUSPENSAO_EXPEDIENTE"
  | "RECESSO_FORENSE";

export type ClassificacaoDiaInstitucional = {
  dataReferencia: Date;
  tipo: TipoDiaInstitucional;
  descricao: string | null;
  fonte: "PADRAO" | "CALENDARIO_INSTITUCIONAL" | "RECESSO_FORENSE";
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
  dataOriginal?: Date | null;
  dataSubstituida?: boolean;
  eventoCalendarioId?: string;
  recessoForenseId?: string;
};

export type CalendarioInstitucionalPrecarregado = {
  eventosPorData: Map<string, NonNullable<EventoCalendarioInstitucionalLite>>;
  recessos: RecessoForenseLite[];
};

function chaveData(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function fimExclusivo(data: Date) {
  const resultado = normalizarDataReferencia(data);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function classificarPorDiaSemana(
  dataReferencia: Date,
): ClassificacaoDiaInstitucional {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);
  const diaSemana = dataNormalizada.getUTCDay();

  if (diaSemana === 0) {
    return {
      dataReferencia: dataNormalizada,
      tipo: "DOMINGO",
      descricao: "Domingo",
      fonte: "PADRAO",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
    };
  }

  if (diaSemana === 6) {
    return {
      dataReferencia: dataNormalizada,
      tipo: "SABADO",
      descricao: "Sábado",
      fonte: "PADRAO",
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
    };
  }

  return {
    dataReferencia: dataNormalizada,
    tipo: "UTIL",
    descricao: "Dia útil regular",
    fonte: "PADRAO",
    contaComoDiaUtil: true,
    geraApuracaoRegular: true,
  };
}

function classificarPorEvento(
  dataReferencia: Date,
  evento: NonNullable<EventoCalendarioInstitucionalLite>,
): ClassificacaoDiaInstitucional {
  return {
    dataReferencia: normalizarDataReferencia(dataReferencia),
    tipo: evento.tipo,
    descricao: evento.descricao,
    fonte: "CALENDARIO_INSTITUCIONAL",
    contaComoDiaUtil: evento.contaComoDiaUtil,
    geraApuracaoRegular: evento.geraApuracaoRegular,
    janelaInicio: evento.janelaInicio,
    janelaFim: evento.janelaFim,
    dataOriginal: evento.dataOriginal,
    dataSubstituida: evento.dataSubstituida,
    eventoCalendarioId: evento.id,
  };
}

function classificarPorRecesso(
  dataReferencia: Date,
  recesso: RecessoForenseLite,
): ClassificacaoDiaInstitucional {
  return {
    dataReferencia: normalizarDataReferencia(dataReferencia),
    tipo: "RECESSO_FORENSE",
    descricao: `Recesso forense ${recesso.ano}`,
    fonte: "RECESSO_FORENSE",
    contaComoDiaUtil: false,
    geraApuracaoRegular: false,
    recessoForenseId: recesso.id,
  };
}

function encontrarRecesso(
  dataReferencia: Date,
  recessos: RecessoForenseLite[],
) {
  const dataNormalizada = normalizarDataReferencia(dataReferencia);

  return recessos.find(
    (recesso) =>
      normalizarDataReferencia(recesso.dataInicio) <= dataNormalizada &&
      normalizarDataReferencia(recesso.dataFim) >= dataNormalizada,
  );
}

async function carregarEventoDoDia(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
) {
  const retornarEventoAtivo = (
    evento: NonNullable<EventoCalendarioInstitucionalLite> | null | undefined,
  ) => (evento?.ativo ? evento : null);

  if (precarregado) {
    return retornarEventoAtivo(
      precarregado.eventosPorData.get(chaveData(dataReferencia)),
    );
  }

  return retornarEventoAtivo(
    await buscarEventoCalendarioInstitucionalPorData(dataReferencia),
  );
}

async function carregarRecessoDoDia(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
) {
  if (precarregado) {
    return encontrarRecesso(dataReferencia, precarregado.recessos) ?? null;
  }

  const recessos = await listarRecessosForensesNoPeriodo(
    dataReferencia,
    fimExclusivo(dataReferencia),
  );

  return encontrarRecesso(dataReferencia, recessos) ?? null;
}

export async function carregarCalendarioInstitucionalPeriodo(params: {
  inicio: Date;
  fimExclusivo: Date;
}): Promise<CalendarioInstitucionalPrecarregado> {
  const [eventos, recessos] = await Promise.all([
    listarEventosCalendarioInstitucionalNoPeriodo(
      params.inicio,
      params.fimExclusivo,
    ),
    listarRecessosForensesNoPeriodo(params.inicio, params.fimExclusivo),
  ]);

  return {
    eventosPorData: new Map(
      eventos.map((evento: NonNullable<EventoCalendarioInstitucionalLite>) => [
        chaveData(evento.dataReferencia),
        evento,
      ]),
    ),
    recessos,
  };
}

export async function classificarDiaInstitucional(
  dataReferencia: Date,
  precarregado?: CalendarioInstitucionalPrecarregado,
): Promise<ClassificacaoDiaInstitucional> {
  const recesso = await carregarRecessoDoDia(dataReferencia, precarregado);

  if (recesso) {
    return classificarPorRecesso(dataReferencia, recesso);
  }

  const evento = await carregarEventoDoDia(dataReferencia, precarregado);

  if (evento) {
    return classificarPorEvento(dataReferencia, evento);
  }

  return classificarPorDiaSemana(dataReferencia);
}
