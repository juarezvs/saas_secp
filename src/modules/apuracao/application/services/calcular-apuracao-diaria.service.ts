import { diferencaEmMinutos } from "./calcular-tempo.service";
import {
  calcularMinutosNoExpediente,
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
    | "SEM_JORNADA";
  status: "CALCULADA" | "INCONSISTENTE";
  primeiraEntrada: Date | null;
  saidaIntervalo: Date | null;
  retornoIntervalo: Date | null;
  ultimaSaida: Date | null;
  janelaExpediente: JanelaExpediente | null;
  minutosForaExpediente: number;
  ocorrencias: OcorrenciaCalculada[];
};

function encontrarMarcacao(marcacoes: MarcacaoCalculo[], tipo: string) {
  return marcacoes.find((marcacao) => marcacao.tipo === tipo)?.dataHora ?? null;
}

export function calcularApuracaoDiaria(params: {
  marcacoes: MarcacaoCalculo[];
  jornada: JornadaCalculo | null;
}): ResultadoCalculoApuracaoDiaria {
  const { marcacoes, jornada } = params;

  if (!jornada) {
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
    return {
      cargaPrevistaMinutos: jornada.cargaDiariaMinutos,
      minutosTrabalhados: 0,
      minutosIntervalo: 0,
      minutosCredito: 0,
      minutosDebito: jornada.cargaDiariaMinutos,
      resultado: "FALTA",
      status: "INCONSISTENTE",
      primeiraEntrada: null,
      saidaIntervalo: null,
      retornoIntervalo: null,
      ultimaSaida: null,
      janelaExpediente,
      minutosForaExpediente: 0,
      ocorrencias: [
        {
          tipo: "FALTA",
          descricao: "Nenhuma marcação registrada no dia.",
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

  const minutosBrutosTrabalhados = Math.max(
    0,
    minutosBrutos - minutosIntervalo,
  );
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

  const minutosCredito = saldo > 0 ? saldo : 0;
  const minutosDebito = saldo < 0 ? Math.abs(saldo) : 0;

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
      descricao: "Tempo trabalhado inferior à carga diária prevista.",
      minutos: minutosDebito,
    });
  }

  const status = ocorrencias.some((o) =>
    [
      "MARCACAO_INCOMPLETA",
      "INTERVALO_INVALIDO",
      "HORA_NAO_AUTORIZADA",
    ].includes(o.tipo),
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
    ocorrencias,
  };
}
