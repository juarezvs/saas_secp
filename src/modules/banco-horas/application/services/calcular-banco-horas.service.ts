type MovimentoSaldo = {
  tipo: string;
  status: string;
  minutos: number;
};

export type ResultadoSaldoBancoHoras = {
  saldoMinutos: number;
  creditosValidadosMinutos: number;
  debitosValidadosMinutos: number;
  creditosPendentesMinutos: number;
  debitosPendentesMinutos: number;
  horasAcimaLimiteMinutos: number;
  horasNaoAutorizadasMinutos: number;
};

export function calcularSaldoBancoHoras(
  movimentos: MovimentoSaldo[],
): ResultadoSaldoBancoHoras {
  const resultado: ResultadoSaldoBancoHoras = {
    saldoMinutos: 0,
    creditosValidadosMinutos: 0,
    debitosValidadosMinutos: 0,
    creditosPendentesMinutos: 0,
    debitosPendentesMinutos: 0,
    horasAcimaLimiteMinutos: 0,
    horasNaoAutorizadasMinutos: 0,
  };

  for (const movimento of movimentos) {
    if (movimento.tipo === "HORAS_ACIMA_LIMITE") {
      resultado.horasAcimaLimiteMinutos += movimento.minutos;
      continue;
    }

    if (movimento.tipo === "HORAS_NAO_AUTORIZADAS") {
      resultado.horasNaoAutorizadasMinutos += movimento.minutos;
      continue;
    }

    if (["DESCONSIDERADO", "ESTORNADO", "EXPIRADO"].includes(movimento.status)) {
      continue;
    }

    if (movimento.tipo === "CREDITO") {
      if (movimento.status === "VALIDADO") {
        resultado.creditosValidadosMinutos += movimento.minutos;
        resultado.saldoMinutos += movimento.minutos;
      } else {
        resultado.creditosPendentesMinutos += movimento.minutos;
      }
    }

    if (movimento.tipo === "DEBITO") {
      if (movimento.status === "VALIDADO") {
        resultado.debitosValidadosMinutos += movimento.minutos;
        resultado.saldoMinutos -= movimento.minutos;
      } else {
        resultado.debitosPendentesMinutos += movimento.minutos;
      }
    }

    if (
      movimento.tipo === "COMPENSACAO_CREDITO" &&
      movimento.status === "VALIDADO"
    ) {
      resultado.saldoMinutos -= movimento.minutos;
    }

    if (
      movimento.tipo === "COMPENSACAO_DEBITO" &&
      movimento.status === "VALIDADO"
    ) {
      resultado.saldoMinutos += movimento.minutos;
    }

  }

  return resultado;
}
