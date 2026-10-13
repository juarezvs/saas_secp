import type { ResultadoRelogioJornada } from "./mct.types";

export type ResultadoLegadoComparavel = {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
};

export type DivergenciaMctLegado = {
  campo: "JORNADA_PREVISTA" | "TEMPO_TRABALHADO" | "CREDITO" | "DEBITO";
  legadoMinutos: number;
  mctMinutos: number;
  diferencaMinutos: number;
  severidade: "INFORMATIVA" | "ATENCAO" | "CRITICA";
  descricao: string;
};

export function compararMctComLegado(params: {
  legado: ResultadoLegadoComparavel;
  mct: ResultadoRelogioJornada;
}) {
  const campos: Array<{
    campo: DivergenciaMctLegado["campo"];
    legado: number;
    mct: number;
    descricao: string;
  }> = [
    {
      campo: "JORNADA_PREVISTA",
      legado: params.legado.cargaPrevistaMinutos,
      mct: params.mct.jornadaPrevistaMinutos,
      descricao: "Diferenca entre as jornadas previstas.",
    },
    {
      campo: "TEMPO_TRABALHADO",
      legado: params.legado.minutosTrabalhados,
      mct: params.mct.tempoEfetivamenteTrabalhadoMinutos,
      descricao: "Diferenca entre os tempos efetivamente trabalhados.",
    },
    {
      campo: "CREDITO",
      legado: params.legado.minutosCredito,
      mct: params.mct.creditoReconhecidoMinutos,
      descricao: "Diferenca entre os creditos reconhecidos.",
    },
    {
      campo: "DEBITO",
      legado: params.legado.minutosDebito,
      mct: params.mct.debitoReconhecidoMinutos,
      descricao: "Diferenca entre os debitos reconhecidos.",
    },
  ];

  const divergencias: DivergenciaMctLegado[] = campos
    .filter((item) => item.legado !== item.mct)
    .map((item) => ({
      campo: item.campo,
      legadoMinutos: item.legado,
      mctMinutos: item.mct,
      diferencaMinutos: item.mct - item.legado,
      severidade: severidade(item.campo, item.legado, item.mct),
      descricao: item.descricao,
    }));

  return {
    divergencias,
    totalDivergencias: divergencias.length,
    possuiDivergenciaCritica: divergencias.some(
      (item) => item.severidade === "CRITICA",
    ),
  };
}

function severidade(
  campo: DivergenciaMctLegado["campo"],
  legado: number,
  mct: number,
): DivergenciaMctLegado["severidade"] {
  if ((campo === "CREDITO" || campo === "DEBITO") && legado !== mct) {
    return "CRITICA";
  }
  return Math.abs(legado - mct) >= 60 ? "ATENCAO" : "INFORMATIVA";
}

