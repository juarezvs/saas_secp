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
  jornada7hIntervaloMinimoMinutos: number;
  exigeAutorizacaoPreviaCredito: boolean;
  horasForaExpedienteInconsistente: boolean;
};

export const REGULAMENTACAO_PONTO_PADRAO: RegulamentacaoPonto = {
  orgaoId: null,
  numeroPortaria: "Portaria SJAM-DIREF 135/2025",
  descricao:
    "Configuração padrão baseada nas regras atualmente praticadas pelo SECP.",
  limiteCreditoMensalMinutos: 16 * 60,
  mesesExpiracaoCompensacao: 3,
  toleranciaCreditoMinutos: 0,
  toleranciaDebitoMinutos: 0,
  jornada7hCreditoMinimoMinutos: 8 * 60,
  jornada7hIntervaloMinimoMinutos: 60,
  exigeAutorizacaoPreviaCredito: true,
  horasForaExpedienteInconsistente: true,
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
  jornada7hIntervaloMinimoMinutos: number;
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
    jornada7hIntervaloMinimoMinutos:
      regulamentacao.jornada7hIntervaloMinimoMinutos,
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
    select: { orgaoId: true },
  });

  return buscarRegulamentacaoPontoOrgao(servidor?.orgaoId);
}
