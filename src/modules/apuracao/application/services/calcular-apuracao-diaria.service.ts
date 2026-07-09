import { diferencaEmMinutos } from "./calcular-tempo.service";
import {
  calcularCargaPrevistaComJanela,
  calcularMinutosNoExpediente,
  resolverExpedienteInstitucional,
  resolverJanelaExpediente,
  type JanelaExpediente,
} from "./expediente.service";
import {
  REGULAMENTACAO_PONTO_PADRAO,
  type RegulamentacaoPonto,
} from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";

type MarcacaoCalculo = {
  id: string;
  tipo: string;
  dataHora: Date;
};

type JornadaCalculo = {
  jornadaServidorId: string;
  cargaDiariaMinutos: number;
  exigeIntervalo: boolean;
  intervaloMinimoMinutos: number | null;
  intervaloMaximoMinutos: number | null;
  horarioDiferenciadoPermitido: boolean;
  horarioDiferenciadoAutorizado: boolean;
  entradaMinimaDiferenciada: string | null;
  saidaMaximaDiferenciada: string | null;
};

type DiaInstitucionalCalculo = {
  tipo: string;
  descricao?: string | null;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
};

type DispensaPontoEletronicoCalculo = {
  ativa: boolean;
  motivos: string[];
  exigeFrequenciaManual: boolean;
};

export type TrabalhoRemotoCalculo = {
  ativo: boolean;
  regime: "TOTAL" | "HIBRIDO";
  diaSemana: string;
  exigeRegistroPonto: boolean;
  descricao: string;
};

export type FrequenciaManualCalculo = {
  obrigatoria: boolean;
  registrada: boolean;
  descricao: string;
};

export type OcorrenciaCalculada = {
  tipo:
    | "MARCACAO_INCOMPLETA"
    | "INTERVALO_INVALIDO"
    | "CREDITO"
    | "DEBITO"
    | "FALTA"
    | "SEM_JORNADA"
    | "HORA_NAO_AUTORIZADA";
  descricao: string;
  minutos: number;
};

export type ResultadoCalculoApuracaoDiaria = {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosIntervalo: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado:
    | "REGULAR"
    | "CREDITO"
    | "DEBITO"
    | "FALTA"
    | "INCOMPLETA"
    | "SEM_JORNADA"
    | "SEM_EXPEDIENTE";
  status: "CALCULADA" | "INCONSISTENTE";
  primeiraEntrada: Date | null;
  saidaIntervalo: Date | null;
  retornoIntervalo: Date | null;
  ultimaSaida: Date | null;
  janelaExpediente: JanelaExpediente | null;
  minutosForaExpediente: number;
  dispensaPontoEletronico: DispensaPontoEletronicoCalculo | null;
  trabalhoRemoto: TrabalhoRemotoCalculo | null;
  frequenciaManual: FrequenciaManualCalculo | null;
  ocorrencias: OcorrenciaCalculada[];
};

const TIPOS_OCORRENCIA_INCONSISTENTE = [
  "MARCACAO_INCOMPLETA",
  "INTERVALO_INVALIDO",
  "FALTA",
  "DEBITO",
] as const;

function encontrarMarcacao(marcacoes: MarcacaoCalculo[], tipo: string) {
  return marcacoes.find((marcacao) => marcacao.tipo === tipo)?.dataHora ?? null;
}

function criarResultadoSemExpediente(params: {
  marcacoes: MarcacaoCalculo[];
  diaInstitucional: DiaInstitucionalCalculo;
}): ResultadoCalculoApuracaoDiaria {
  return {
    cargaPrevistaMinutos: 0,
    minutosTrabalhados: 0,
    minutosIntervalo: 0,
    minutosCredito: 0,
    minutosDebito: 0,
    resultado: "SEM_EXPEDIENTE",
    status: "CALCULADA",
    primeiraEntrada: encontrarMarcacao(params.marcacoes, "ENTRADA"),
    saidaIntervalo: encontrarMarcacao(params.marcacoes, "SAIDA_INTERVALO"),
    retornoIntervalo: encontrarMarcacao(params.marcacoes, "RETORNO_INTERVALO"),
    ultimaSaida: encontrarMarcacao(params.marcacoes, "SAIDA"),
    janelaExpediente: null,
    minutosForaExpediente: 0,
    dispensaPontoEletronico: null,
    trabalhoRemoto: null,
    frequenciaManual: null,
    ocorrencias: [],
  };
}

export function calcularApuracaoDiaria(params: {
  marcacoes: MarcacaoCalculo[];
  jornada: JornadaCalculo | null;
  diaInstitucional?: DiaInstitucionalCalculo | null;
  dispensaPontoEletronico?: DispensaPontoEletronicoCalculo | null;
  fusoHorario?: string | null;
  regulamentacao?: RegulamentacaoPonto | null;
}): ResultadoCalculoApuracaoDiaria {
  const {
    marcacoes,
    jornada,
    diaInstitucional = null,
    dispensaPontoEletronico = null,
    fusoHorario = null,
    regulamentacao = REGULAMENTACAO_PONTO_PADRAO,
  } = params;
  const regras = regulamentacao ?? REGULAMENTACAO_PONTO_PADRAO;
  const expedienteInstitucional =
    resolverExpedienteInstitucional(diaInstitucional);
  const diaSemExpediente =
    !expedienteInstitucional.temExpedienteOrdinario;

  if (!jornada) {
    if (diaSemExpediente && marcacoes.length === 0 && diaInstitucional) {
      return criarResultadoSemExpediente({
        marcacoes,
        diaInstitucional,
      });
    }

    return {
      cargaPrevistaMinutos: 0,
      minutosTrabalhados: 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: 0,
      resultado: "SEM_JORNADA",
      status: "INCONSISTENTE",
      primeiraEntrada: null,
      saidaIntervalo: null,
      retornoIntervalo: null,
      ultimaSaida: null,
      janelaExpediente: null,
      minutosForaExpediente: 0,
      dispensaPontoEletronico,
      trabalhoRemoto: null,
      frequenciaManual: null,
      ocorrencias: [
        {
          tipo: "SEM_JORNADA",
          descricao: "Servidor sem jornada vigente para a data.",
          minutos: 0,
        },
      ],
    };
  }

  const cargaPrevistaDia = diaSemExpediente
    ? 0
    : calcularCargaPrevistaComJanela(
        jornada.cargaDiariaMinutos,
        expedienteInstitucional.janelaPadrao,
      );
  const janelaInstitucionalEspecial =
    diaInstitucional?.janelaInicio && diaInstitucional.janelaFim
      ? {
          inicio: diaInstitucional.janelaInicio,
          fim: diaInstitucional.janelaFim,
        }
      : null;
  const janelaExpedienteDia = diaSemExpediente
    ? null
    : resolverJanelaExpediente(jornada, janelaInstitucionalEspecial);

  if (dispensaPontoEletronico?.ativa) {
    return {
      cargaPrevistaMinutos: cargaPrevistaDia,
      minutosTrabalhados: cargaPrevistaDia,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: 0,
      resultado: "REGULAR",
      status: "CALCULADA",
      primeiraEntrada: null,
      saidaIntervalo: null,
      retornoIntervalo: null,
      ultimaSaida: null,
      janelaExpediente: janelaExpedienteDia,
      minutosForaExpediente: 0,
      dispensaPontoEletronico,
      trabalhoRemoto: null,
      frequenciaManual: dispensaPontoEletronico.exigeFrequenciaManual
        ? {
            obrigatoria: true,
            registrada: false,
            descricao:
              "Frequencia manual dispensada pela dispensa de ponto na data.",
          }
        : null,
      ocorrencias: [],
    };
  }

  const ordenadas = marcacoes
    .filter((m) =>
      ["ENTRADA", "SAIDA_INTERVALO", "RETORNO_INTERVALO", "SAIDA"].includes(
        m.tipo,
      ),
    )
    .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

  const entrada = encontrarMarcacao(ordenadas, "ENTRADA");
  const saidaIntervalo = encontrarMarcacao(ordenadas, "SAIDA_INTERVALO");
  const retornoIntervalo = encontrarMarcacao(ordenadas, "RETORNO_INTERVALO");
  const saida = encontrarMarcacao(ordenadas, "SAIDA");

  const ocorrencias: OcorrenciaCalculada[] = [];
  const janelaExpediente = janelaExpedienteDia;

  if (ordenadas.length === 0) {
    if (diaSemExpediente && diaInstitucional) {
      return criarResultadoSemExpediente({
        marcacoes: ordenadas,
        diaInstitucional,
      });
    }

    const exigeFrequenciaManual =
      Boolean(dispensaPontoEletronico?.ativa) &&
      Boolean(dispensaPontoEletronico?.exigeFrequenciaManual);

    return {
      cargaPrevistaMinutos: cargaPrevistaDia,
      minutosTrabalhados: dispensaPontoEletronico?.ativa
        ? cargaPrevistaDia
        : 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: dispensaPontoEletronico?.ativa
        ? 0
        : cargaPrevistaDia,
      resultado: dispensaPontoEletronico?.ativa ? "REGULAR" : "FALTA",
      status: dispensaPontoEletronico?.ativa && !exigeFrequenciaManual
        ? "CALCULADA"
        : "INCONSISTENTE",
      primeiraEntrada: null,
      saidaIntervalo: null,
      retornoIntervalo: null,
      ultimaSaida: null,
      janelaExpediente,
      minutosForaExpediente: 0,
      dispensaPontoEletronico,
      trabalhoRemoto: null,
      frequenciaManual: exigeFrequenciaManual
        ? {
            obrigatoria: true,
            registrada: false,
            descricao:
              "Frequencia manual obrigatoria para servidor dispensado do ponto eletronico.",
          }
        : null,
      ocorrencias: dispensaPontoEletronico?.ativa
        ? exigeFrequenciaManual
          ? [
              {
                tipo: "MARCACAO_INCOMPLETA",
                descricao:
                  "Frequencia manual obrigatoria nao registrada para servidor dispensado do ponto eletronico.",
                minutos: 0,
              },
            ]
          : []
        : [
            {
              tipo: "FALTA",
              descricao:
                "Ausencia integral durante o expediente, sem autorizacao da chefia.",
              minutos: cargaPrevistaDia,
            },
          ],
    };
  }

  if (!entrada || !saida) {
    ocorrencias.push({
      tipo: "MARCACAO_INCOMPLETA",
      descricao:
        "Marcações incompletas. É necessário haver entrada e saída para apuração regular.",
      minutos: 0,
    });

    return {
      cargaPrevistaMinutos: cargaPrevistaDia,
      minutosTrabalhados: 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: cargaPrevistaDia,
      resultado: "INCOMPLETA",
      status: "INCONSISTENTE",
      primeiraEntrada: entrada,
      saidaIntervalo,
      retornoIntervalo,
      ultimaSaida: saida,
      janelaExpediente,
      minutosForaExpediente: 0,
      dispensaPontoEletronico,
      trabalhoRemoto: null,
      frequenciaManual: null,
      ocorrencias,
    };
  }

  const minutosBrutos = diferencaEmMinutos(entrada, saida);
  let minutosIntervalo = 0;
  let minutosIntervaloParaCalculo = 0;

  if (jornada.exigeIntervalo) {
    if (!saidaIntervalo || !retornoIntervalo) {
      ocorrencias.push({
        tipo: "MARCACAO_INCOMPLETA",
        descricao:
          "Jornada exige intervalo, mas saída e/ou retorno do intervalo não foram registrados.",
        minutos: 0,
      });

      return {
        cargaPrevistaMinutos: cargaPrevistaDia,
        minutosTrabalhados: 0,
        minutosIntervalo: 0,
        minutosCredito: 0,
        minutosDebito: cargaPrevistaDia,
        resultado: "INCOMPLETA",
        status: "INCONSISTENTE",
        primeiraEntrada: entrada,
        saidaIntervalo,
        retornoIntervalo,
        ultimaSaida: saida,
        janelaExpediente,
        minutosForaExpediente: 0,
        dispensaPontoEletronico,
        trabalhoRemoto: null,
        frequenciaManual: null,
        ocorrencias,
      };
    }

    minutosIntervalo = diferencaEmMinutos(saidaIntervalo, retornoIntervalo);
    minutosIntervaloParaCalculo = minutosIntervalo;

    if (
      jornada.intervaloMinimoMinutos &&
      minutosIntervalo < jornada.intervaloMinimoMinutos
    ) {
      minutosIntervaloParaCalculo = jornada.intervaloMinimoMinutos;
      ocorrencias.push({
        tipo: "INTERVALO_INVALIDO",
        descricao: `Intervalo inferior ao mínimo de ${jornada.intervaloMinimoMinutos} minutos.`,
        minutos: minutosIntervalo,
      });
    }

    if (
      jornada.intervaloMaximoMinutos &&
      minutosIntervalo > jornada.intervaloMaximoMinutos
    ) {
      ocorrencias.push({
        tipo: "INTERVALO_INVALIDO",
        descricao: `Intervalo superior ao máximo de ${jornada.intervaloMaximoMinutos} minutos.`,
        minutos: minutosIntervalo,
      });
    }
  }

  if (!jornada.exigeIntervalo && saidaIntervalo && retornoIntervalo) {
    minutosIntervalo = diferencaEmMinutos(saidaIntervalo, retornoIntervalo);
    minutosIntervaloParaCalculo = minutosIntervalo;
  }

  const minutosBrutosTrabalhados = Math.max(
    0,
    minutosBrutos - minutosIntervalo,
  );

  if (diaSemExpediente) {
    const minutosTrabalhados = Math.max(
      0,
      minutosBrutos - minutosIntervaloParaCalculo,
    );
    const ocorrenciasDiaSemExpediente = [...ocorrencias];

    if (minutosTrabalhados > 0) {
      ocorrenciasDiaSemExpediente.push({
        tipo: "CREDITO",
        descricao:
          "Tempo trabalhado em dia sem expediente ordinário, contabilizado integralmente como crédito.",
        minutos: minutosTrabalhados,
      });
    }

    const status = ocorrenciasDiaSemExpediente.some((o) =>
      ["MARCACAO_INCOMPLETA", "INTERVALO_INVALIDO"].includes(o.tipo),
    )
      ? "INCONSISTENTE"
      : "CALCULADA";

    return {
      cargaPrevistaMinutos: 0,
      minutosTrabalhados,
      minutosIntervalo,
      minutosCredito: minutosTrabalhados,
      minutosDebito: 0,
      resultado: minutosTrabalhados > 0 ? "CREDITO" : "SEM_EXPEDIENTE",
      status,
      primeiraEntrada: entrada,
      saidaIntervalo,
      retornoIntervalo,
      ultimaSaida: saida,
      janelaExpediente: null,
      minutosForaExpediente: 0,
      dispensaPontoEletronico,
      trabalhoRemoto: null,
      frequenciaManual: null,
      ocorrencias: ocorrenciasDiaSemExpediente,
    };
  }

  if (!janelaExpediente) {
    throw new Error("Janela de expediente nao resolvida para dia util.");
  }

  const minutosBrutosNoExpediente = calcularMinutosNoExpediente({
    inicio: entrada,
    fim: saida,
    janela: janelaExpediente,
    fusoHorario,
  });
  const minutosIntervaloNoExpediente =
    saidaIntervalo && retornoIntervalo
      ? calcularMinutosNoExpediente({
          inicio: saidaIntervalo,
          fim: retornoIntervalo,
          janela: janelaExpediente,
          fusoHorario,
        })
      : 0;
  const minutosTrabalhadosNoExpediente = Math.max(
    0,
    minutosBrutosNoExpediente - minutosIntervaloNoExpediente,
  );
  const ajusteIntervaloMinimo = Math.max(
    0,
    minutosIntervaloParaCalculo - minutosIntervalo,
  );
  const minutosTrabalhados = Math.max(
    0,
    minutosBrutosTrabalhados - ajusteIntervaloMinimo,
  );
  const minutosForaExpediente = Math.max(
    0,
    minutosBrutosTrabalhados - minutosTrabalhadosNoExpediente,
  );

  if (minutosForaExpediente > 0) {
    ocorrencias.push({
      tipo: "HORA_NAO_AUTORIZADA",
      descricao: janelaExpediente.diferenciada
        ? `Há ${minutosForaExpediente} minuto(s) fora da janela diferenciada autorizada de ${janelaExpediente.inicio} a ${janelaExpediente.fim}.`
        : `Há ${minutosForaExpediente} minuto(s) fora do expediente padrão de ${janelaExpediente.inicio} a ${janelaExpediente.fim}, sem autorização de horário diferenciado.`,
      minutos: minutosForaExpediente,
    });
  }
  const saldo = minutosTrabalhados - cargaPrevistaDia;

  let minutosCredito = saldo > 0 ? saldo : 0;
  let minutosDebito = saldo < 0 ? Math.abs(saldo) : 0;

  if (minutosCredito > 0 && minutosCredito <= regras.toleranciaCreditoMinutos) {
    minutosCredito = 0;
  }

  if (minutosDebito > 0 && minutosDebito <= regras.toleranciaDebitoMinutos) {
    minutosDebito = 0;
  }

  if (
    jornada.cargaDiariaMinutos === 7 * 60 &&
    !jornada.exigeIntervalo &&
    minutosTrabalhados > cargaPrevistaDia
  ) {
    const intervaloCumprido =
      saidaIntervalo &&
      retornoIntervalo &&
      minutosIntervalo >= regras.jornada7hIntervaloMinimoMinutos;

    minutosCredito = intervaloCumprido
      ? Math.max(0, minutosTrabalhados - regras.jornada7hCreditoMinimoMinutos)
      : 0;
    minutosDebito = 0;

    if (
      minutosTrabalhados >= regras.jornada7hCreditoMinimoMinutos &&
      !intervaloCumprido
    ) {
      ocorrencias.push({
        tipo: "INTERVALO_INVALIDO",
        descricao: `A jornada de 7 horas somente gera credito apos ${Math.floor(
          regras.jornada7hCreditoMinimoMinutos / 60,
        )} horas efetivas e com intervalo minimo de ${
          regras.jornada7hIntervaloMinimoMinutos
        } minutos.`,
        minutos: minutosIntervalo,
      });
    }
  }

  let resultado: ResultadoCalculoApuracaoDiaria["resultado"] = "REGULAR";

  if (minutosCredito > 0) {
    resultado = "CREDITO";
    ocorrencias.push({
      tipo: "CREDITO",
      descricao: "Tempo trabalhado superior à carga diária prevista.",
      minutos: minutosCredito,
    });
  }

  if (minutosDebito > 0) {
    resultado = "DEBITO";
    ocorrencias.push({
      tipo: "DEBITO",
      descricao:
        "Ausencia parcial durante o expediente, sem autorizacao da chefia.",
      minutos: minutosDebito,
    });
  }

  const status = ocorrencias.some(
    (o) =>
      TIPOS_OCORRENCIA_INCONSISTENTE.includes(
        o.tipo as (typeof TIPOS_OCORRENCIA_INCONSISTENTE)[number],
      ) ||
      (o.tipo === "HORA_NAO_AUTORIZADA" &&
        regras.horasForaExpedienteInconsistente),
  )
    ? "INCONSISTENTE"
    : "CALCULADA";

  return {
    cargaPrevistaMinutos: cargaPrevistaDia,
    minutosTrabalhados,
    minutosIntervalo,
    minutosCredito,
    minutosDebito,
    resultado,
    status,
    primeiraEntrada: entrada,
    saidaIntervalo,
    retornoIntervalo,
    ultimaSaida: saida,
    janelaExpediente,
    minutosForaExpediente,
    dispensaPontoEletronico,
    trabalhoRemoto: null,
    frequenciaManual: null,
    ocorrencias,
  };
}
