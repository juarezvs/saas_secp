import {
  calcularPrazoEncaminhamentoBoletimCompetencia,
  calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario,
  formatarDataPrazoRegulatorio,
} from "../../../frequencia/application/services/prazo-regulatorio-frequencia.service";
import { buscarRegulamentacaoPontoOrgao } from "../../../regulamentacao-ponto/application/services/regulamentacao-ponto.service";

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
  diaLimiteMesSeguinte?: number;
}) {
  const prazo = calcularPrazoEncaminhamentoBoletimCompetencia({
    anoReferencia: params.dataReferencia.getFullYear(),
    mesReferencia: params.dataReferencia.getMonth() + 1,
    hoje: params.hoje,
    diaLimiteMesSeguinte: params.diaLimiteMesSeguinte,
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
  orgaoId?: string | null;
  diaLimiteMesSeguinte?: number;
}) {
  const regulamentacao = params.orgaoId
    ? await buscarRegulamentacaoPontoOrgao(params.orgaoId)
    : null;
  const prazo = await calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario(
    {
      anoReferencia: params.dataReferencia.getFullYear(),
      mesReferencia: params.dataReferencia.getMonth() + 1,
      hoje: params.hoje,
      diaLimiteMesSeguinte:
        params.diaLimiteMesSeguinte ??
        regulamentacao?.prazoAjustePontoDiaMesSeguinte,
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
