import { diferencaEmMinutos } from "./calcular-tempo.service";
import {
  calcularMinutosNoExpediente,
  resolverExpedienteInstitucional,
  resolverJanelaExpediente,
  type JanelaExpediente,
} from "./expediente.service";

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

const CARGA_MINIMA_CREDITO_JORNADA_SETE_HORAS = 8 * 60;
const INTERVALO_MINIMO_CREDITO_JORNADA_SETE_HORAS = 60;
const TIPOS_OCORRENCIA_INCONSISTENTE = [
  "MARCACAO_INCOMPLETA",
  "INTERVALO_INVALIDO",
  "HORA_NAO_AUTORIZADA",
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
}): ResultadoCalculoApuracaoDiaria {
  const {
    marcacoes,
    jornada,
    diaInstitucional = null,
    dispensaPontoEletronico = null,
  } = params;
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
  const janelaExpediente = resolverJanelaExpediente(jornada);

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
      cargaPrevistaMinutos: jornada.cargaDiariaMinutos,
      minutosTrabalhados: dispensaPontoEletronico?.ativa
        ? jornada.cargaDiariaMinutos
        : 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: dispensaPontoEletronico?.ativa
        ? 0
        : jornada.cargaDiariaMinutos,
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
              minutos: jornada.cargaDiariaMinutos,
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
      cargaPrevistaMinutos: jornada.cargaDiariaMinutos,
      minutosTrabalhados: 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: jornada.cargaDiariaMinutos,
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
        cargaPrevistaMinutos: jornada.cargaDiariaMinutos,
        minutosTrabalhados: 0,
        minutosIntervalo: 0,
        minutosCredito: 0,
        minutosDebito: jornada.cargaDiariaMinutos,
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

  const minutosBrutosNoExpediente = calcularMinutosNoExpediente({
    inicio: entrada,
    fim: saida,
    janela: janelaExpediente,
  });
  const minutosIntervaloNoExpediente =
    saidaIntervalo && retornoIntervalo
      ? calcularMinutosNoExpediente({
          inicio: saidaIntervalo,
          fim: retornoIntervalo,
          janela: janelaExpediente,
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
    minutosTrabalhadosNoExpediente - ajusteIntervaloMinimo,
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
  const saldo = minutosTrabalhados - jornada.cargaDiariaMinutos;

  let minutosCredito = saldo > 0 ? saldo : 0;
  let minutosDebito = saldo < 0 ? Math.abs(saldo) : 0;

  if (
    jornada.cargaDiariaMinutos === 7 * 60 &&
    !jornada.exigeIntervalo &&
    minutosTrabalhados > jornada.cargaDiariaMinutos
  ) {
    const intervaloCumprido =
      saidaIntervalo &&
      retornoIntervalo &&
      minutosIntervalo >= INTERVALO_MINIMO_CREDITO_JORNADA_SETE_HORAS;

    minutosCredito = intervaloCumprido
      ? Math.max(0, minutosTrabalhados - CARGA_MINIMA_CREDITO_JORNADA_SETE_HORAS)
      : 0;
    minutosDebito = 0;

    if (
      minutosTrabalhados >= CARGA_MINIMA_CREDITO_JORNADA_SETE_HORAS &&
      !intervaloCumprido
    ) {
      ocorrencias.push({
        tipo: "INTERVALO_INVALIDO",
        descricao:
          "A jornada de 7 horas somente gera credito apos 8 horas efetivas e com intervalo minimo de 60 minutos.",
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

  const status = ocorrencias.some((o) =>
    TIPOS_OCORRENCIA_INCONSISTENTE.includes(
      o.tipo as (typeof TIPOS_OCORRENCIA_INCONSISTENTE)[number],
    ),
  )
    ? "INCONSISTENTE"
    : "CALCULADA";

  return {
    cargaPrevistaMinutos: jornada.cargaDiariaMinutos,
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
