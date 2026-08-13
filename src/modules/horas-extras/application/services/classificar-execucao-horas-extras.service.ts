import type { OvertimeDayType } from "../../domain/horas-extras.types";

export type CategoriaIntervaloHoraExtra =
  | "COMPENSACAO_DEBITO"
  | "EXCEDENTE_A_AUTORIZACAO"
  | "FORA_FAIXA_PERMITIDA"
  | "HORA_EXTRA_RECONHECIDA"
  | "NAO_AUTORIZADA";

export type IntervaloTrabalhoHoraExtra = {
  id?: string;
  data: string;
  inicio: string;
  fim: string;
};

export type RegraAutorizacaoHoraExtra = {
  data?: string;
  limiteMinutos?: number;
  faixaInicio?: string;
  faixaFim?: string;
  tipoDia?: OvertimeDayType;
};

export type AutorizacaoHoraExtraClassificacao = {
  periodoInicio: string;
  periodoFim: string;
  limiteGlobalMinutos?: number;
  limitesPorTipoDia?: Partial<Record<OvertimeDayType, number>>;
  regrasPorData?: RegraAutorizacaoHoraExtra[];
  faixaInicio?: string;
  faixaFim?: string;
};

export type SegmentoClassificadoHoraExtra = {
  data: string;
  inicio: string;
  fim: string;
  minutos: number;
  categoria: CategoriaIntervaloHoraExtra;
  intervaloOrigemId?: string;
  motivo: string;
  tipoDia?: OvertimeDayType;
};

export type ResultadoClassificacaoHoraExtra = {
  segmentos: SegmentoClassificadoHoraExtra[];
  totais: Record<CategoriaIntervaloHoraExtra | "TRABALHADO" | "ANALISAVEL", number>;
  debitoInicialMinutos: number;
  debitoCompensadoMinutos: number;
  debitoRemanescenteMinutos: number;
  autorizadoReconhecidoMinutos: number;
};

type SegmentoAnalisavel = {
  data: string;
  inicioMinutos: number;
  fimMinutos: number;
  intervaloOrigemId?: string;
  tipoDia: OvertimeDayType;
  limiteDiario?: number;
};

const CATEGORIAS: CategoriaIntervaloHoraExtra[] = [
  "COMPENSACAO_DEBITO",
  "EXCEDENTE_A_AUTORIZACAO",
  "FORA_FAIXA_PERMITIDA",
  "HORA_EXTRA_RECONHECIDA",
  "NAO_AUTORIZADA",
];

function parseMinutos(horario: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(horario);

  if (!match) {
    throw new Error(`Horario invalido: ${horario}`);
  }

  const horas = Number(match[1]);
  const minutos = Number(match[2]);

  if (horas > 23 || minutos > 59) {
    throw new Error(`Horario invalido: ${horario}`);
  }

  return horas * 60 + minutos;
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function chaveData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error(`Data invalida: ${data}`);
  }

  return data;
}

function inferirTipoDia(data: string): OvertimeDayType {
  const diaSemanaUtc = new Date(`${data}T00:00:00.000Z`).getUTCDay();

  if (diaSemanaUtc === 0) {
    return "DOMINGO";
  }

  if (diaSemanaUtc === 6) {
    return "SABADO";
  }

  return "DIA_UTIL";
}

function criarTotais(): ResultadoClassificacaoHoraExtra["totais"] {
  return {
    TRABALHADO: 0,
    ANALISAVEL: 0,
    COMPENSACAO_DEBITO: 0,
    EXCEDENTE_A_AUTORIZACAO: 0,
    FORA_FAIXA_PERMITIDA: 0,
    HORA_EXTRA_RECONHECIDA: 0,
    NAO_AUTORIZADA: 0,
  };
}

function somarSegmento(
  totais: ResultadoClassificacaoHoraExtra["totais"],
  segmento: SegmentoClassificadoHoraExtra,
) {
  totais[segmento.categoria] += segmento.minutos;
}

function criarSegmento(params: {
  data: string;
  inicioMinutos: number;
  fimMinutos: number;
  categoria: CategoriaIntervaloHoraExtra;
  motivo: string;
  intervaloOrigemId?: string;
  tipoDia?: OvertimeDayType;
}): SegmentoClassificadoHoraExtra | null {
  const minutos = params.fimMinutos - params.inicioMinutos;

  if (minutos <= 0) {
    return null;
  }

  return {
    data: params.data,
    inicio: formatarMinutos(params.inicioMinutos),
    fim: formatarMinutos(params.fimMinutos),
    minutos,
    categoria: params.categoria,
    intervaloOrigemId: params.intervaloOrigemId,
    motivo: params.motivo,
    tipoDia: params.tipoDia,
  };
}

function obterRegraData(
  autorizacao: AutorizacaoHoraExtraClassificacao,
  data: string,
) {
  return autorizacao.regrasPorData?.find((regra) => regra.data === data);
}

function obterRegraGeral(autorizacao: AutorizacaoHoraExtraClassificacao) {
  return autorizacao.regrasPorData?.find(
    (regra) => !regra.data && !regra.tipoDia,
  );
}

function possuiDatasEspecificas(
  autorizacao: AutorizacaoHoraExtraClassificacao,
) {
  return autorizacao.regrasPorData?.some((regra) => Boolean(regra.data)) ?? false;
}

function estaNoPeriodo(
  autorizacao: AutorizacaoHoraExtraClassificacao,
  data: string,
) {
  return data >= autorizacao.periodoInicio && data <= autorizacao.periodoFim;
}

function obterLimiteDiario(
  autorizacao: AutorizacaoHoraExtraClassificacao,
  data: string,
  tipoDia: OvertimeDayType,
) {
  const regraData = obterRegraData(autorizacao, data);
  const regraGeral = obterRegraGeral(autorizacao);

  return (
    regraData?.limiteMinutos ??
    regraGeral?.limiteMinutos ??
    autorizacao.limitesPorTipoDia?.[tipoDia] ??
    autorizacao.limiteGlobalMinutos
  );
}

function obterFaixa(
  autorizacao: AutorizacaoHoraExtraClassificacao,
  data: string,
) {
  const regraData = obterRegraData(autorizacao, data);
  const regraGeral = obterRegraGeral(autorizacao);
  const faixaInicio = regraData?.faixaInicio ?? regraGeral?.faixaInicio ?? autorizacao.faixaInicio;
  const faixaFim = regraData?.faixaFim ?? regraGeral?.faixaFim ?? autorizacao.faixaFim;

  return {
    inicio: faixaInicio ? parseMinutos(faixaInicio) : 0,
    fim: faixaFim ? parseMinutos(faixaFim) : 24 * 60,
  };
}

function adicionarSegmento(
  segmentos: SegmentoClassificadoHoraExtra[],
  totais: ResultadoClassificacaoHoraExtra["totais"],
  segmento: SegmentoClassificadoHoraExtra | null,
) {
  if (!segmento) {
    return;
  }

  segmentos.push(segmento);
  somarSegmento(totais, segmento);
}

export function classificarExecucaoHorasExtras(params: {
  autorizacao: AutorizacaoHoraExtraClassificacao;
  intervalosTrabalhados: IntervaloTrabalhoHoraExtra[];
  debitoInicialMinutos?: number;
}): ResultadoClassificacaoHoraExtra {
  const segmentos: SegmentoClassificadoHoraExtra[] = [];
  const analisaveis: SegmentoAnalisavel[] = [];
  const totais = criarTotais();
  const usadoNoDia = new Map<string, number>();
  let debitoRestante = Math.max(0, params.debitoInicialMinutos ?? 0);
  let autorizadoReconhecidoMinutos = 0;
  let limiteGlobalRestante = params.autorizacao.limiteGlobalMinutos ?? Infinity;

  const intervalosOrdenados = [...params.intervalosTrabalhados].sort((a, b) =>
    `${a.data} ${a.inicio}`.localeCompare(`${b.data} ${b.inicio}`),
  );

  for (const intervalo of intervalosOrdenados) {
    const data = chaveData(intervalo.data);
    const inicioMinutos = parseMinutos(intervalo.inicio);
    const fimMinutos = parseMinutos(intervalo.fim);
    const minutosTrabalhados = fimMinutos - inicioMinutos;

    if (minutosTrabalhados <= 0) {
      throw new Error("Intervalo trabalhado deve possuir fim posterior ao inicio.");
    }

    totais.TRABALHADO += minutosTrabalhados;

    const regraData = obterRegraData(params.autorizacao, data);
    const tipoDia = regraData?.tipoDia ?? inferirTipoDia(data);
    const dataExplicitamenteAutorizada =
      !possuiDatasEspecificas(params.autorizacao) || Boolean(regraData);

    if (!estaNoPeriodo(params.autorizacao, data) || !dataExplicitamenteAutorizada) {
      adicionarSegmento(
        segmentos,
        totais,
        criarSegmento({
          data,
          inicioMinutos,
          fimMinutos,
          categoria: "NAO_AUTORIZADA",
          intervaloOrigemId: intervalo.id,
          motivo: "Data fora do periodo ou das datas autorizadas.",
          tipoDia,
        }),
      );
      continue;
    }

    const faixa = obterFaixa(params.autorizacao, data);
    const inicioAnalisavel = Math.max(inicioMinutos, faixa.inicio);
    const fimAnalisavel = Math.min(fimMinutos, faixa.fim);

    adicionarSegmento(
      segmentos,
      totais,
      criarSegmento({
        data,
        inicioMinutos,
        fimMinutos: Math.min(fimMinutos, faixa.inicio),
        categoria: "FORA_FAIXA_PERMITIDA",
        intervaloOrigemId: intervalo.id,
        motivo: "Trabalho antes da faixa horaria autorizada.",
        tipoDia,
      }),
    );

    adicionarSegmento(
      segmentos,
      totais,
      criarSegmento({
        data,
        inicioMinutos: Math.max(inicioMinutos, faixa.fim),
        fimMinutos,
        categoria: "FORA_FAIXA_PERMITIDA",
        intervaloOrigemId: intervalo.id,
        motivo: "Trabalho depois da faixa horaria autorizada.",
        tipoDia,
      }),
    );

    if (fimAnalisavel > inicioAnalisavel) {
      totais.ANALISAVEL += fimAnalisavel - inicioAnalisavel;
      analisaveis.push({
        data,
        inicioMinutos: inicioAnalisavel,
        fimMinutos: fimAnalisavel,
        intervaloOrigemId: intervalo.id,
        tipoDia,
        limiteDiario: obterLimiteDiario(params.autorizacao, data, tipoDia),
      });
    }
  }

  for (const segmento of analisaveis) {
    let cursor = segmento.inicioMinutos;

    if (debitoRestante > 0) {
      const minutosCompensados = Math.min(
        debitoRestante,
        segmento.fimMinutos - cursor,
      );

      adicionarSegmento(
        segmentos,
        totais,
        criarSegmento({
          data: segmento.data,
          inicioMinutos: cursor,
          fimMinutos: cursor + minutosCompensados,
          categoria: "COMPENSACAO_DEBITO",
          intervaloOrigemId: segmento.intervaloOrigemId,
          motivo: "Debito de horas compensado antes do reconhecimento de hora extra.",
          tipoDia: segmento.tipoDia,
        }),
      );

      cursor += minutosCompensados;
      debitoRestante -= minutosCompensados;
    }

    if (cursor >= segmento.fimMinutos) {
      continue;
    }

    const usadoAnteriormenteNoDia = usadoNoDia.get(segmento.data) ?? 0;
    const limiteDiarioRestante =
      segmento.limiteDiario === undefined
        ? Infinity
        : Math.max(0, segmento.limiteDiario - usadoAnteriormenteNoDia);
    const reconhecivel = Math.min(
      segmento.fimMinutos - cursor,
      limiteDiarioRestante,
      limiteGlobalRestante,
    );

    adicionarSegmento(
      segmentos,
      totais,
      criarSegmento({
        data: segmento.data,
        inicioMinutos: cursor,
        fimMinutos: cursor + reconhecivel,
        categoria: "HORA_EXTRA_RECONHECIDA",
        intervaloOrigemId: segmento.intervaloOrigemId,
        motivo: "Trabalho dentro da autorizacao apos compensacao de debito.",
        tipoDia: segmento.tipoDia,
      }),
    );

    cursor += reconhecivel;
    autorizadoReconhecidoMinutos += reconhecivel;
    usadoNoDia.set(
      segmento.data,
      usadoAnteriormenteNoDia + reconhecivel,
    );

    if (Number.isFinite(limiteGlobalRestante)) {
      limiteGlobalRestante -= reconhecivel;
    }

    adicionarSegmento(
      segmentos,
      totais,
      criarSegmento({
        data: segmento.data,
        inicioMinutos: cursor,
        fimMinutos: segmento.fimMinutos,
        categoria: "EXCEDENTE_A_AUTORIZACAO",
        intervaloOrigemId: segmento.intervaloOrigemId,
        motivo: "Trabalho analisavel acima do limite autorizado.",
        tipoDia: segmento.tipoDia,
      }),
    );
  }

  const debitoInicialMinutos = Math.max(0, params.debitoInicialMinutos ?? 0);

  return {
    segmentos: segmentos.sort((a, b) =>
      `${a.data} ${a.inicio} ${CATEGORIAS.indexOf(a.categoria)}`.localeCompare(
        `${b.data} ${b.inicio} ${CATEGORIAS.indexOf(b.categoria)}`,
      ),
    ),
    totais,
    debitoInicialMinutos,
    debitoCompensadoMinutos: debitoInicialMinutos - debitoRestante,
    debitoRemanescenteMinutos: debitoRestante,
    autorizadoReconhecidoMinutos,
  };
}
