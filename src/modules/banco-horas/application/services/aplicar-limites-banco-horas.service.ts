export const LIMITE_CREDITO_MENSAL_MINUTOS = 16 * 60;

export type ResultadoLimiteCreditoMensal = {
  minutosComputaveis: number;
  minutosAcimaLimite: number;
};

export function aplicarLimiteCreditoMensal(params: {
  creditoDoDiaMinutos: number;
  creditoJaComputadoNoMesMinutos: number;
}): ResultadoLimiteCreditoMensal {
  const restante = Math.max(
    0,
    LIMITE_CREDITO_MENSAL_MINUTOS - params.creditoJaComputadoNoMesMinutos,
  );

  const minutosComputaveis = Math.min(params.creditoDoDiaMinutos, restante);
  const minutosAcimaLimite = Math.max(
    0,
    params.creditoDoDiaMinutos - minutosComputaveis,
  );

  return {
    minutosComputaveis,
    minutosAcimaLimite,
  };
}

export function calcularDataExpiracaoCompensacao(params: {
  anoReferencia: number;
  mesReferencia: number;
}) {
  /*
   * Regra inicial: expira ao final do 3º mês posterior ao mês de referência.
   * Ex.: referência maio/2026 → expiração em 31/08/2026.
   */
  const primeiroDiaMesPosteriorAoPrazo = new Date(
    params.anoReferencia,
    params.mesReferencia + 3,
    1,
  );

  const ultimoDiaPrazo = new Date(primeiroDiaMesPosteriorAoPrazo);
  ultimoDiaPrazo.setDate(0);
  ultimoDiaPrazo.setHours(0, 0, 0, 0);

  return ultimoDiaPrazo;
}
