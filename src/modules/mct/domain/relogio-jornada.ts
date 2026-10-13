import type {
  IntervaloTrabalhado,
  PoliticaJornadaMct,
  ResultadoRelogioJornada,
} from "./mct.types";
import { duracaoMinutos } from "./tempo";

export function executarRelogioJornada(params: {
  politica: PoliticaJornadaMct;
  intervalosTrabalhados: IntervaloTrabalhado[];
  jornadaPrevistaMinutos?: number;
  minutosReconhecidosComoExercicio?: number;
  creditoReconhecidoMinutos?: number;
  debitoReconhecidoMinutos?: number;
}): ResultadoRelogioJornada {
  const minutosTrabalhados = params.intervalosTrabalhados.reduce(
    (total, intervalo) => total + duracaoMinutos(intervalo),
    0,
  );
  const primeiraEntrada = params.intervalosTrabalhados[0]?.inicio ?? null;
  const ultimaSaida = params.intervalosTrabalhados.at(-1)?.fim ?? null;
  const permanenciaBrutaMinutos =
    primeiraEntrada && ultimaSaida
      ? duracaoMinutos({ inicio: primeiraEntrada, fim: ultimaSaida })
      : 0;
  const intervalosNaoComputaveisMinutos = Math.max(
    0,
    permanenciaBrutaMinutos - minutosTrabalhados,
  );
  const reconhecidos = Math.max(
    0,
    params.minutosReconhecidosComoExercicio ?? 0,
  );
  const tempoComputavelMinutos = minutosTrabalhados + reconhecidos;
  const exigivel = params.politica.cargaExigivelMinutos;
  const excedenteBrutoMinutos = Math.max(0, tempoComputavelMinutos - exigivel);
  const tempoFaltanteMinutos = Math.max(0, exigivel - tempoComputavelMinutos);
  const creditoReconhecidoMinutos = limitarReconhecimento(
    params.creditoReconhecidoMinutos,
    excedenteBrutoMinutos,
  );
  const debitoReconhecidoMinutos = limitarReconhecimento(
    params.debitoReconhecidoMinutos,
    tempoFaltanteMinutos,
  );

  return {
    jornadaPrevistaMinutos: params.jornadaPrevistaMinutos ?? exigivel,
    jornadaExigivelMinutos: exigivel,
    permanenciaBrutaMinutos,
    tempoEfetivamenteTrabalhadoMinutos: minutosTrabalhados,
    intervalosNaoComputaveisMinutos,
    tempoComputavelMinutos,
    tempoFaltanteMinutos,
    excedenteBrutoMinutos,
    creditoReconhecidoMinutos,
    debitoReconhecidoMinutos,
    excedentePendenteMinutos: Math.max(
      0,
      excedenteBrutoMinutos - creditoReconhecidoMinutos,
    ),
    jornadaCompletadaEm: calcularInstanteConclusao(
      params.intervalosTrabalhados,
      exigivel - reconhecidos,
    ),
  };
}

function limitarReconhecimento(valor: number | undefined, limite: number) {
  if (valor == null) return 0;
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error("Reconhecimento temporal deve ser inteiro e nao negativo.");
  }
  return Math.min(valor, limite);
}

function calcularInstanteConclusao(
  intervalos: IntervaloTrabalhado[],
  minutosNecessarios: number,
) {
  if (minutosNecessarios <= 0) {
    return intervalos[0]?.inicio ?? null;
  }

  let restantes = minutosNecessarios;
  for (const intervalo of intervalos) {
    const minutos = duracaoMinutos(intervalo);
    if (restantes <= minutos) {
      return new Date(intervalo.inicio.getTime() + restantes * 60_000);
    }
    restantes -= minutos;
  }

  return null;
}

