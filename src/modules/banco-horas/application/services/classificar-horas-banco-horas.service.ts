import type { ClassificacaoDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";

type RegulamentacaoBancoHoras = {
  jornada7hCreditoMinimoMinutos: number;
  jornada7hIntervaloMinimoMinutos: number;
  jornada7hCreditoExigeIntervalo: boolean;
  entradaMinimaPermitida: string;
  saidaMaximaPermitida: string;
  percentualCreditoSabado: number;
  percentualCreditoDomingoFeriado: number;
  percentualCreditoRecesso: number;
};

type ApuracaoBancoHoras = {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosIntervalo: number;
  minutosCredito: number;
  primeiraEntrada?: Date | null;
  ultimaSaida?: Date | null;
};

export type ClassificacaoHorasBancoHoras = {
  minutosComputaveis: number;
  minutosNaoComputaveis: number;
  multiplicadorAplicado: number;
  codigoFundamento:
    | "DIA_UTIL_AUTORIZADO"
    | "JORNADA_7H_APOS_OITAVA_HORA"
    | "JORNADA_7H_SEM_INTERVALO_MINIMO"
    | "SABADO_CONVERSAO_AUTORIZADA"
    | "DOMINGO_FERIADO_CONVERSAO_AUTORIZADA"
    | "PONTO_FACULTATIVO_APOS_OITAVA_HORA"
    | "PONTO_FACULTATIVO_SEM_INTERVALO_MINIMO"
    | "RECESSO_FORENSE_REGRA_ESPECIFICA"
    | "SEM_AUTORIZACAO_PREVIA";
  fundamento: string;
  alertas: string[];
  exigeJustificativaEspecifica: boolean;
  exigeReferendoDiref: boolean;
};

function minutosDoDia(data?: Date | null) {
  if (!data) {
    return null;
  }

  return data.getUTCHours() * 60 + data.getUTCMinutes();
}

function arredondarMinutos(valor: number) {
  return Math.max(0, Math.round(valor));
}

function horaParaMinutos(valor: string) {
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function multiplicadorPercentual(percentual: number) {
  return 1 + percentual / 100;
}

function minutosExcedentesReais(apuracao: ApuracaoBancoHoras) {
  return Math.max(
    0,
    apuracao.minutosTrabalhados - apuracao.cargaPrevistaMinutos,
  );
}

function horaForaPeriodoOrdinario(
  apuracao: ApuracaoBancoHoras,
  regulamentacao: RegulamentacaoBancoHoras,
) {
  const entrada = minutosDoDia(apuracao.primeiraEntrada);
  const saida = minutosDoDia(apuracao.ultimaSaida);
  const entradaMinima = horaParaMinutos(regulamentacao.entradaMinimaPermitida);
  const saidaMaxima = horaParaMinutos(regulamentacao.saidaMaximaPermitida);

  return Boolean(
    (entrada !== null && entrada < entradaMinima) ||
      (saida !== null && saida > saidaMaxima),
  );
}

function resultadoNaoComputavel(params: {
  minutos: number;
  codigoFundamento: ClassificacaoHorasBancoHoras["codigoFundamento"];
  fundamento: string;
  alertas?: string[];
  exigeJustificativaEspecifica?: boolean;
}) {
  return {
    minutosComputaveis: 0,
    minutosNaoComputaveis: Math.max(0, params.minutos),
    multiplicadorAplicado: 1,
    codigoFundamento: params.codigoFundamento,
    fundamento: params.fundamento,
    alertas: params.alertas ?? [],
    exigeJustificativaEspecifica: params.exigeJustificativaEspecifica ?? false,
    exigeReferendoDiref: false,
  };
}

export function classificarHorasCreditoBancoHoras(params: {
  apuracao: ApuracaoBancoHoras;
  classificacaoDia: ClassificacaoDiaInstitucional;
  regulamentacao: RegulamentacaoBancoHoras;
  temAutorizacaoPrevia: boolean;
  permiteConversaoEspecial?: boolean;
}): ClassificacaoHorasBancoHoras {
  const { apuracao, classificacaoDia, regulamentacao } = params;
  const minutosApurados = Math.min(
    Math.max(0, apuracao.minutosCredito),
    minutosExcedentesReais(apuracao),
  );
  const alertas: string[] = [];
  const exigeJustificativaEspecifica = horaForaPeriodoOrdinario(
    apuracao,
    regulamentacao,
  );

  if (exigeJustificativaEspecifica) {
    alertas.push(
      `Há registro antes das ${regulamentacao.entradaMinimaPermitida} ou depois das ${regulamentacao.saidaMaximaPermitida}; a chefia deve registrar justificativa específica.`,
    );
  }

  if (!params.temAutorizacaoPrevia) {
    return resultadoNaoComputavel({
      minutos: minutosApurados,
      codigoFundamento: "SEM_AUTORIZACAO_PREVIA",
      fundamento:
        "Tempo excedente sem autorização prévia da chefia. Não integra o banco de horas.",
      alertas,
      exigeJustificativaEspecifica,
    });
  }

  if (classificacaoDia.tipo === "RECESSO_FORENSE") {
    const multiplicador = multiplicadorPercentual(
      regulamentacao.percentualCreditoRecesso,
    );
    const computaveis = params.permiteConversaoEspecial
      ? arredondarMinutos(minutosApurados * multiplicador)
      : 0;

    return {
      minutosComputaveis: computaveis,
      minutosNaoComputaveis: Math.max(0, minutosApurados - computaveis),
      multiplicadorAplicado: computaveis > 0 ? multiplicador : 1,
      codigoFundamento: "RECESSO_FORENSE_REGRA_ESPECIFICA",
      fundamento:
        "Recesso forense com conversão administrativa autorizada, conforme regulamentação própria do órgão.",
      alertas,
      exigeJustificativaEspecifica,
      exigeReferendoDiref: false,
    };
  }

  if (classificacaoDia.tipo === "SABADO") {
    const multiplicador = multiplicadorPercentual(
      regulamentacao.percentualCreditoSabado,
    );
    const computaveis = params.permiteConversaoEspecial
      ? arredondarMinutos(minutosApurados * multiplicador)
      : 0;

    return {
      minutosComputaveis: computaveis,
      minutosNaoComputaveis: Math.max(0, minutosApurados - computaveis),
      multiplicadorAplicado: computaveis > 0 ? multiplicador : 1,
      codigoFundamento: "SABADO_CONVERSAO_AUTORIZADA",
      fundamento:
        "Sábado com conversão administrativa autorizada; aplica-se acréscimo de 50% ao tempo trabalhado.",
      alertas,
      exigeJustificativaEspecifica,
      exigeReferendoDiref: false,
    };
  }

  if (classificacaoDia.tipo === "DOMINGO" || classificacaoDia.tipo === "FERIADO") {
    const multiplicador = multiplicadorPercentual(
      regulamentacao.percentualCreditoDomingoFeriado,
    );
    const computaveis = params.permiteConversaoEspecial
      ? arredondarMinutos(minutosApurados * multiplicador)
      : 0;

    return {
      minutosComputaveis: computaveis,
      minutosNaoComputaveis: Math.max(0, minutosApurados - computaveis),
      multiplicadorAplicado: computaveis > 0 ? multiplicador : 1,
      codigoFundamento: "DOMINGO_FERIADO_CONVERSAO_AUTORIZADA",
      fundamento:
        "Domingo ou feriado com conversão administrativa autorizada; aplica-se crédito em dobro ao tempo trabalhado.",
      alertas,
      exigeJustificativaEspecifica,
      exigeReferendoDiref: false,
    };
  }

  if (classificacaoDia.tipo === "PONTO_FACULTATIVO") {
    if (
      regulamentacao.jornada7hCreditoExigeIntervalo &&
      apuracao.minutosIntervalo < regulamentacao.jornada7hIntervaloMinimoMinutos
    ) {
      return resultadoNaoComputavel({
        minutos: minutosApurados,
        codigoFundamento: "PONTO_FACULTATIVO_SEM_INTERVALO_MINIMO",
        fundamento:
          "Ponto facultativo sem intervalo mínimo regulamentar. O excedente não foi computado no banco de horas.",
        alertas,
        exigeJustificativaEspecifica,
      });
    }

    const excedenteAposOitavaHora = Math.max(
      0,
      apuracao.minutosTrabalhados - regulamentacao.jornada7hCreditoMinimoMinutos,
    );
    const multiplicador = multiplicadorPercentual(
      regulamentacao.percentualCreditoSabado,
    );
    const computaveis = params.permiteConversaoEspecial
      ? arredondarMinutos(
          Math.min(excedenteAposOitavaHora, minutosApurados) * multiplicador,
        )
      : 0;

    return {
      minutosComputaveis: computaveis,
      minutosNaoComputaveis: Math.max(0, minutosApurados - computaveis),
      multiplicadorAplicado: computaveis > 0 ? multiplicador : 1,
      codigoFundamento: "PONTO_FACULTATIVO_APOS_OITAVA_HORA",
      fundamento:
        "Ponto facultativo autorizado; somente o tempo após a oitava hora é convertido com acréscimo de 50%.",
      alertas,
      exigeJustificativaEspecifica,
      exigeReferendoDiref: false,
    };
  }

  if (apuracao.cargaPrevistaMinutos === 7 * 60) {
    if (
      regulamentacao.jornada7hCreditoExigeIntervalo &&
      apuracao.minutosIntervalo < regulamentacao.jornada7hIntervaloMinimoMinutos
    ) {
      return resultadoNaoComputavel({
        minutos: minutosApurados,
        codigoFundamento: "JORNADA_7H_SEM_INTERVALO_MINIMO",
        fundamento:
          "Servidor com jornada de 7h sem intervalo mínimo de 1h. O período excedente não foi computado.",
        alertas,
        exigeJustificativaEspecifica,
      });
    }

    const computaveis = Math.min(
      minutosApurados,
      Math.max(
        0,
        apuracao.minutosTrabalhados -
          regulamentacao.jornada7hCreditoMinimoMinutos,
      ),
    );

    return {
      minutosComputaveis: computaveis,
      minutosNaoComputaveis: Math.max(0, minutosApurados - computaveis),
      multiplicadorAplicado: 1,
      codigoFundamento: "JORNADA_7H_APOS_OITAVA_HORA",
      fundamento:
        "Servidor com jornada de 7h: o crédito é computado apenas a partir da oitava hora, com intervalo mínimo cumprido.",
      alertas,
      exigeJustificativaEspecifica,
      exigeReferendoDiref: false,
    };
  }

  return {
    minutosComputaveis: minutosApurados,
    minutosNaoComputaveis: 0,
    multiplicadorAplicado: 1,
    codigoFundamento: "DIA_UTIL_AUTORIZADO",
    fundamento:
      "Crédito em dia útil autorizado previamente pela chefia e sujeito à homologação mensal.",
    alertas,
    exigeJustificativaEspecifica,
    exigeReferendoDiref: false,
  };
}
