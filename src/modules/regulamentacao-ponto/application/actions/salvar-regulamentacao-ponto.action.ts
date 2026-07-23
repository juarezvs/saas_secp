"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { enfileirarRecalculoRegulamentacaoPonto } from "../queues/recalcular-regulamentacao-ponto-queue";
import { garantirRecalcularRegulamentacaoPontoWorkerAutomatico } from "../workers/recalcular-regulamentacao-ponto-worker-runtime";

function converterHoraMinutoParaMinutos(valor: unknown) {
  if (typeof valor !== "string") {
    return valor;
  }

  const match = /^(\d{1,3}):([0-5]\d)$/.exec(valor.trim());

  if (!match) {
    return valor;
  }

  const [, horas, minutos] = match;

  return Number(horas) * 60 + Number(minutos);
}

function minutosSchema(min: number, max: number) {
  return z.preprocess(
    converterHoraMinutoParaMinutos,
    z.coerce.number().int().min(min).max(max),
  );
}

const horaSchema = z.string().regex(/^\d{2}:[0-5]\d$/, "Informe hh:mm.");

const regulamentacaoSchema = z.object({
  orgaoId: z.string().uuid("Informe o órgão."),
  numeroPortaria: z.string().trim().max(120).optional().or(z.literal("")),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
  limiteCreditoMensalMinutos: minutosSchema(0, 6000),
  mesesExpiracaoCompensacao: z.coerce.number().int().min(1).max(24),
  toleranciaCreditoMinutos: minutosSchema(0, 120),
  toleranciaDebitoMinutos: minutosSchema(0, 120),
  jornada7hCreditoMinimoMinutos: minutosSchema(420, 720),
  jornada7hCargoComissionadoCreditoMinimoMinutos: minutosSchema(420, 720),
  jornada7hIntervaloMinimoMinutos: minutosSchema(0, 180),
  jornada7hCreditoExigeIntervalo: z.coerce.boolean().default(false),
  expedientePadraoInicio: horaSchema,
  expedientePadraoFim: horaSchema,
  entradaMinimaPermitida: horaSchema,
  saidaMaximaPermitida: horaSchema,
  prazoHomologacaoDiaMesSeguinte: z.coerce.number().int().min(1).max(31),
  prazoAjustePontoDiaMesSeguinte: z.coerce.number().int().min(1).max(31),
  percentualCreditoSabado: z.coerce.number().int().min(0).max(300),
  percentualCreditoDomingoFeriado: z.coerce.number().int().min(0).max(300),
  percentualCreditoRecesso: z.coerce.number().int().min(0).max(300),
  recessoIgnoraLimiteMensal: z.coerce.boolean().default(true),
  exigeAutorizacaoPreviaCredito: z.coerce.boolean().default(true),
  horasForaExpedienteInconsistente: z.coerce.boolean().default(false),
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
    jornada7hCargoComissionadoCreditoMinimoMinutos: formData.get(
      "jornada7hCargoComissionadoCreditoMinimoMinutos",
    ),
    jornada7hIntervaloMinimoMinutos: formData.get(
      "jornada7hIntervaloMinimoMinutos",
    ),
    jornada7hCreditoExigeIntervalo: checkboxLigado(
      formData,
      "jornada7hCreditoExigeIntervalo",
    ),
    expedientePadraoInicio: String(formData.get("expedientePadraoInicio") ?? ""),
    expedientePadraoFim: String(formData.get("expedientePadraoFim") ?? ""),
    entradaMinimaPermitida: String(formData.get("entradaMinimaPermitida") ?? ""),
    saidaMaximaPermitida: String(formData.get("saidaMaximaPermitida") ?? ""),
    prazoHomologacaoDiaMesSeguinte: formData.get(
      "prazoHomologacaoDiaMesSeguinte",
    ),
    prazoAjustePontoDiaMesSeguinte: formData.get(
      "prazoAjustePontoDiaMesSeguinte",
    ),
    percentualCreditoSabado: formData.get("percentualCreditoSabado"),
    percentualCreditoDomingoFeriado: formData.get(
      "percentualCreditoDomingoFeriado",
    ),
    percentualCreditoRecesso: formData.get("percentualCreditoRecesso"),
    recessoIgnoraLimiteMensal: checkboxLigado(
      formData,
      "recessoIgnoraLimiteMensal",
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
