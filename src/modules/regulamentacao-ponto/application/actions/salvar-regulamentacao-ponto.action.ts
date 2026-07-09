"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { enfileirarRecalculoRegulamentacaoPonto } from "../queues/recalcular-regulamentacao-ponto-queue";
import { garantirRecalcularRegulamentacaoPontoWorkerAutomatico } from "../workers/recalcular-regulamentacao-ponto-worker-runtime";

const regulamentacaoSchema = z.object({
  orgaoId: z.string().uuid("Informe o órgão."),
  numeroPortaria: z.string().trim().max(120).optional().or(z.literal("")),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
  limiteCreditoMensalMinutos: z.coerce.number().int().min(0).max(6000),
  mesesExpiracaoCompensacao: z.coerce.number().int().min(1).max(24),
  toleranciaCreditoMinutos: z.coerce.number().int().min(0).max(120),
  toleranciaDebitoMinutos: z.coerce.number().int().min(0).max(120),
  jornada7hCreditoMinimoMinutos: z.coerce.number().int().min(420).max(720),
  jornada7hIntervaloMinimoMinutos: z.coerce.number().int().min(0).max(180),
  exigeAutorizacaoPreviaCredito: z.coerce.boolean().default(true),
  horasForaExpedienteInconsistente: z.coerce.boolean().default(true),
  ativo: z.coerce.boolean().default(true),
  recalcularCompetencia: z.coerce.boolean().default(false),
  competencia: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Informe a competencia no formato AAAA-MM."),
});

function checkboxLigado(formData: FormData, nome: string) {
  return formData.get(nome) === "on" || formData.get(nome) === "true";
}

function extrairDados(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? ""),
    numeroPortaria: String(formData.get("numeroPortaria") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    limiteCreditoMensalMinutos: formData.get("limiteCreditoMensalMinutos"),
    mesesExpiracaoCompensacao: formData.get("mesesExpiracaoCompensacao"),
    toleranciaCreditoMinutos: formData.get("toleranciaCreditoMinutos"),
    toleranciaDebitoMinutos: formData.get("toleranciaDebitoMinutos"),
    jornada7hCreditoMinimoMinutos: formData.get(
      "jornada7hCreditoMinimoMinutos",
    ),
    jornada7hIntervaloMinimoMinutos: formData.get(
      "jornada7hIntervaloMinimoMinutos",
    ),
    exigeAutorizacaoPreviaCredito: checkboxLigado(
      formData,
      "exigeAutorizacaoPreviaCredito",
    ),
    horasForaExpedienteInconsistente: checkboxLigado(
      formData,
      "horasForaExpedienteInconsistente",
    ),
    ativo: checkboxLigado(formData, "ativo"),
    recalcularCompetencia: checkboxLigado(formData, "recalcularCompetencia"),
    competencia: String(formData.get("competencia") ?? ""),
  };
}

function dividirCompetencia(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);

  return {
    anoReferencia: ano,
    mesReferencia: mes,
  };
}

export async function salvarRegulamentacaoPontoAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "regulamentacao-ponto:gerenciar:global",
  );
  const parsed = regulamentacaoSchema.safeParse(extrairDados(formData));

  if (!parsed.success) {
    throw new Error("Dados inválidos para a regulamentação de ponto.");
  }

  const { recalcularCompetencia, competencia, ...dados } = parsed.data;
  const { anoReferencia, mesReferencia } = dividirCompetencia(competencia);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  if (!escopoOrgao.global && !escopoOrgao.orgaoIds.includes(dados.orgaoId)) {
    throw new Error("Seccional fora do escopo do perfil ativo.");
  }

  const antes = await prisma.regulamentacaoPontoOrgao.findUnique({
    where: { orgaoId: dados.orgaoId },
  });

  const regulamentacao = await prisma.regulamentacaoPontoOrgao.upsert({
    where: { orgaoId: dados.orgaoId },
    update: {
      ...dados,
      numeroPortaria: dados.numeroPortaria || null,
      descricao: dados.descricao || null,
    },
    create: {
      ...dados,
      numeroPortaria: dados.numeroPortaria || null,
      descricao: dados.descricao || null,
    },
  });

  let recalculoJobId: string | null = null;

  if (recalcularCompetencia) {
    const job = await enfileirarRecalculoRegulamentacaoPonto({
      orgaoId: dados.orgaoId,
      anoReferencia,
      mesReferencia,
      usuarioIdAuditoria: permissao.usuarioId,
    });
    recalculoJobId = String(job.id);
    garantirRecalcularRegulamentacaoPontoWorkerAutomatico();
  }

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "RegulamentacaoPontoOrgao",
      entidadeId: regulamentacao.id,
      acao: "REGULAMENTACAO_PONTO_ORGAO_SALVA",
      dadosAntes: antes ?? undefined,
      dadosDepois: {
        regulamentacao,
        recalculo: recalcularCompetencia
          ? {
              anoReferencia,
              mesReferencia,
              jobId: recalculoJobId,
              status: "ENFILEIRADO",
            }
          : null,
      },
    },
  });

  revalidatePath("/administracao/regulamentacao-ponto");
  revalidatePath(`/administracao/regulamentacao-ponto/${dados.orgaoId}`);
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}
