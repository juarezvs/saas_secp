import { prisma } from "@/shared/infrastructure/database/prisma";

export type RegulamentacaoPonto = {
  orgaoId: string | null;
  numeroPortaria: string;
  descricao: string;
  limiteCreditoMensalMinutos: number;
  mesesExpiracaoCompensacao: number;
  toleranciaCreditoMinutos: number;
  toleranciaDebitoMinutos: number;
  jornada7hCreditoMinimoMinutos: number;
  jornada7hCargoComissionadoCreditoMinimoMinutos: number;
  jornada7hIntervaloMinimoMinutos: number;
  jornada7hCreditoExigeIntervalo: boolean;
  expedientePadraoInicio: string;
  expedientePadraoFim: string;
  entradaMinimaPermitida: string;
  saidaMaximaPermitida: string;
  prazoHomologacaoDiaMesSeguinte: number;
  prazoAjustePontoDiaMesSeguinte: number;
  percentualCreditoSabado: number;
  percentualCreditoDomingoFeriado: number;
  percentualCreditoRecesso: number;
  recessoIgnoraLimiteMensal: boolean;
  exigeAutorizacaoPreviaCredito: boolean;
  horasForaExpedienteInconsistente: boolean;
};

export const REGULAMENTACAO_PONTO_PADRAO: RegulamentacaoPonto = {
  orgaoId: null,
  numeroPortaria: "Resolução Presi TRF1-SECGE 10119147/2020",
  descricao:
    "Configuração padrão baseada na regulamentação geral de ponto eletrônico do TRF1.",
  limiteCreditoMensalMinutos: 16 * 60,
  mesesExpiracaoCompensacao: 3,
  toleranciaCreditoMinutos: 0,
  toleranciaDebitoMinutos: 0,
  jornada7hCreditoMinimoMinutos: 7 * 60,
  jornada7hCargoComissionadoCreditoMinimoMinutos: 8 * 60,
  jornada7hIntervaloMinimoMinutos: 60,
  jornada7hCreditoExigeIntervalo: false,
  expedientePadraoInicio: "09:00",
  expedientePadraoFim: "18:00",
  entradaMinimaPermitida: "07:00",
  saidaMaximaPermitida: "19:00",
  prazoHomologacaoDiaMesSeguinte: 10,
  prazoAjustePontoDiaMesSeguinte: 10,
  percentualCreditoSabado: 50,
  percentualCreditoDomingoFeriado: 100,
  percentualCreditoRecesso: 100,
  recessoIgnoraLimiteMensal: true,
  exigeAutorizacaoPreviaCredito: true,
  horasForaExpedienteInconsistente: false,
};

type RegulamentacaoBanco = {
  orgaoId: string;
  numeroPortaria: string | null;
  descricao: string | null;
  limiteCreditoMensalMinutos: number;
  mesesExpiracaoCompensacao: number;
  toleranciaCreditoMinutos: number;
  toleranciaDebitoMinutos: number;
  jornada7hCreditoMinimoMinutos: number;
  jornada7hCargoComissionadoCreditoMinimoMinutos: number;
  jornada7hIntervaloMinimoMinutos: number;
  jornada7hCreditoExigeIntervalo: boolean;
  expedientePadraoInicio: string;
  expedientePadraoFim: string;
  entradaMinimaPermitida: string;
  saidaMaximaPermitida: string;
  prazoHomologacaoDiaMesSeguinte: number;
  prazoAjustePontoDiaMesSeguinte: number;
  percentualCreditoSabado: number;
  percentualCreditoDomingoFeriado: number;
  percentualCreditoRecesso: number;
  recessoIgnoraLimiteMensal: boolean;
  exigeAutorizacaoPreviaCredito: boolean;
  horasForaExpedienteInconsistente: boolean;
  ativo: boolean;
};

export function normalizarRegulamentacaoPonto(
  regulamentacao?: RegulamentacaoBanco | null,
): RegulamentacaoPonto {
  if (!regulamentacao?.ativo) {
    return REGULAMENTACAO_PONTO_PADRAO;
  }

  return {
    orgaoId: regulamentacao.orgaoId,
    numeroPortaria:
      regulamentacao.numeroPortaria ??
      REGULAMENTACAO_PONTO_PADRAO.numeroPortaria,
    descricao:
      regulamentacao.descricao ?? REGULAMENTACAO_PONTO_PADRAO.descricao,
    limiteCreditoMensalMinutos: regulamentacao.limiteCreditoMensalMinutos,
    mesesExpiracaoCompensacao: regulamentacao.mesesExpiracaoCompensacao,
    toleranciaCreditoMinutos: regulamentacao.toleranciaCreditoMinutos,
    toleranciaDebitoMinutos: regulamentacao.toleranciaDebitoMinutos,
    jornada7hCreditoMinimoMinutos:
      regulamentacao.jornada7hCreditoMinimoMinutos,
    jornada7hCargoComissionadoCreditoMinimoMinutos:
      regulamentacao.jornada7hCargoComissionadoCreditoMinimoMinutos,
    jornada7hIntervaloMinimoMinutos:
      regulamentacao.jornada7hIntervaloMinimoMinutos,
    jornada7hCreditoExigeIntervalo:
      regulamentacao.jornada7hCreditoExigeIntervalo,
    expedientePadraoInicio: regulamentacao.expedientePadraoInicio,
    expedientePadraoFim: regulamentacao.expedientePadraoFim,
    entradaMinimaPermitida: regulamentacao.entradaMinimaPermitida,
    saidaMaximaPermitida: regulamentacao.saidaMaximaPermitida,
    prazoHomologacaoDiaMesSeguinte:
      regulamentacao.prazoHomologacaoDiaMesSeguinte,
    prazoAjustePontoDiaMesSeguinte:
      regulamentacao.prazoAjustePontoDiaMesSeguinte,
    percentualCreditoSabado: regulamentacao.percentualCreditoSabado,
    percentualCreditoDomingoFeriado:
      regulamentacao.percentualCreditoDomingoFeriado,
    percentualCreditoRecesso: regulamentacao.percentualCreditoRecesso,
    recessoIgnoraLimiteMensal: regulamentacao.recessoIgnoraLimiteMensal,
    exigeAutorizacaoPreviaCredito:
      regulamentacao.exigeAutorizacaoPreviaCredito,
    horasForaExpedienteInconsistente:
      regulamentacao.horasForaExpedienteInconsistente,
  };
}

export async function buscarRegulamentacaoPontoOrgao(
  orgaoId?: string | null,
) {
  if (!orgaoId) {
    return REGULAMENTACAO_PONTO_PADRAO;
  }

  const regulamentacao = await prisma.regulamentacaoPontoOrgao.findUnique({
    where: { orgaoId },
  });

  return normalizarRegulamentacaoPonto(regulamentacao);
}

export async function buscarRegulamentacaoPontoServidor(servidorId: string) {
  const servidor = await prisma.servidor.findUnique({
    where: { id: servidorId },
    select: {
      orgaoId: true,
      horasForaExpedienteInconsistente: true,
    },
  });

  const regulamentacao = await buscarRegulamentacaoPontoOrgao(
    servidor?.orgaoId,
  );

  if (typeof servidor?.horasForaExpedienteInconsistente === "boolean") {
    return {
      ...regulamentacao,
      horasForaExpedienteInconsistente:
        servidor.horasForaExpedienteInconsistente,
    };
  }

  return regulamentacao;
}
