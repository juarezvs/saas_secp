type MovimentoSaldo = {
  tipo: string;
  origem?: string;
  status: string;
  minutos: number;
  anoReferencia?: number;
  mesReferencia?: number;
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
  options: { competenciaInicioControle?: string | null } = {},
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

  const competenciaInicio = normalizarCompetenciaInicio(
    options.competenciaInicioControle,
  );

  for (const movimento of movimentos) {
    if (
      competenciaInicio &&
      movimento.origem !== "IMPORTACAO" &&
      movimento.anoReferencia &&
      movimento.mesReferencia &&
      compararCompetenciaMovimento(movimento, competenciaInicio) < 0
    ) {
      continue;
    }

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

function normalizarCompetenciaInicio(competencia?: string | null) {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  return Number.isInteger(ano) && mes >= 1 && mes <= 12 ? { ano, mes } : null;
}

function compararCompetenciaMovimento(
  movimento: MovimentoSaldo,
  competencia: { ano: number; mes: number },
) {
  const ano = movimento.anoReferencia ?? 0;
  const mes = movimento.mesReferencia ?? 0;

  return ano === competencia.ano ? mes - competencia.mes : ano - competencia.ano;
}
