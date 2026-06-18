import {
  calcularPrazoEncaminhamentoBoletimCompetencia,
  calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario,
  formatarDataPrazoRegulatorio,
} from "../../../frequencia/application/services/prazo-regulatorio-frequencia.service";

export class PrazoAjustePontoExpiradoError extends Error {
  constructor(
    public readonly dataReferencia: Date,
    public readonly dataLimite: Date,
  ) {
    super(
      `O prazo para correcao da marcacao expirou em ${formatarDataPrazoRegulatorio(
        dataLimite,
      )}.`,
    );
    this.name = "PrazoAjustePontoExpiradoError";
  }
}

export function verificarPrazoAjustePonto(params: {
  dataReferencia: Date;
  hoje?: Date;
}) {
  const prazo = calcularPrazoEncaminhamentoBoletimCompetencia({
    anoReferencia: params.dataReferencia.getFullYear(),
    mesReferencia: params.dataReferencia.getMonth() + 1,
    hoje: params.hoje,
  });

  if (prazo.situacao === "VENCIDO") {
    throw new PrazoAjustePontoExpiradoError(
      params.dataReferencia,
      prazo.dataLimite,
    );
  }

  return prazo;
}

export async function verificarPrazoAjustePontoComCalendario(params: {
  dataReferencia: Date;
  hoje?: Date;
}) {
  const prazo = await calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario(
    {
      anoReferencia: params.dataReferencia.getFullYear(),
      mesReferencia: params.dataReferencia.getMonth() + 1,
      hoje: params.hoje,
    },
  );

  if (prazo.situacao === "VENCIDO") {
    throw new PrazoAjustePontoExpiradoError(
      params.dataReferencia,
      prazo.dataLimite,
    );
  }

  return prazo;
}
