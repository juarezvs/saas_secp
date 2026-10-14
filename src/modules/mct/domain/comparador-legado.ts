import type { ResultadoRelogioConformidade, ResultadoRelogioJornada } from "./mct.types";

export type ResultadoLegadoComparavel = {
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
};

export type DivergenciaMctLegado = {
  campo: "JORNADA_PREVISTA" | "TEMPO_TRABALHADO" | "CREDITO" | "DEBITO" | "OCORRENCIA";
  legadoMinutos: number;
  mctMinutos: number;
  diferencaMinutos: number;
  severidade: "INFORMATIVA" | "ATENCAO" | "CRITICA";
  descricao: string;
};

export function compararMctComLegado(params: {
  legado: ResultadoLegadoComparavel;
  mct: ResultadoRelogioJornada;
  conformidade?: ResultadoRelogioConformidade;
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
  const legadoComPendencia = !["REGULAR", "OK", "CONCLUIDA", "HOMOLOGADA"].includes(params.legado.resultado.toUpperCase());
  const mctComPendencia = params.conformidade?.possuiPendencias ?? false;
  if (params.conformidade && legadoComPendencia !== mctComPendencia) {
    divergencias.push({ campo: "OCORRENCIA", legadoMinutos: legadoComPendencia ? 1 : 0, mctMinutos: mctComPendencia ? 1 : 0, diferencaMinutos: (mctComPendencia ? 1 : 0) - (legadoComPendencia ? 1 : 0), severidade: "ATENCAO", descricao: "Diferença entre a ocorrência legada e o Relógio de Conformidade." });
  }

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

