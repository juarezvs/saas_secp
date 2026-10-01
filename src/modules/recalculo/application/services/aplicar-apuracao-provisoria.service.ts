import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import type {
  OcorrenciaCalculada,
  ResultadoCalculoApuracaoDiaria,
} from "@/modules/apuracao/application/services/calcular-apuracao-diaria.service";

const RESULTADOS_DEPENDENTES_DO_FECHAMENTO = new Set([
  "DEBITO",
  "FALTA",
  "INCOMPLETA",
]);

const OCORRENCIAS_DEPENDENTES_DO_FECHAMENTO = new Set([
  "DEBITO",
  "FALTA",
  "MARCACAO_INCOMPLETA",
]);

export function dataReferenciaNaoEncerrada(
  dataReferencia: Date,
  agora = new Date(),
) {
  return normalizarDataReferencia(dataReferencia) >= normalizarDataReferencia(agora);
}

export function aplicarApuracaoProvisoriaDiaNaoEncerrado(params: {
  calculo: ResultadoCalculoApuracaoDiaria;
  dataReferencia: Date;
  agora?: Date;
}): ResultadoCalculoApuracaoDiaria {
  const { calculo, dataReferencia, agora } = params;

  if (
    !dataReferenciaNaoEncerrada(dataReferencia, agora) ||
    !RESULTADOS_DEPENDENTES_DO_FECHAMENTO.has(calculo.resultado)
  ) {
    return calculo;
  }

  return {
    ...calculo,
    minutosDebito: 0,
    resultado: "REGULAR",
    status: "PENDENTE",
    ocorrencias: calculo.ocorrencias.filter(
      (ocorrencia) =>
        !OCORRENCIAS_DEPENDENTES_DO_FECHAMENTO.has(
          ocorrencia.tipo as OcorrenciaCalculada["tipo"],
        ),
    ),
  };
}
