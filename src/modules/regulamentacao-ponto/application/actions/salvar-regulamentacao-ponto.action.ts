"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "@/modules/recalculo/application/services/regerar-banco-horas-mes.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

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
  anoReferencia: z.coerce.number().int().min(2020).max(2100),
  mesReferencia: z.coerce.number().int().min(1).max(12),
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
    anoReferencia: formData.get("anoReferencia"),
    mesReferencia: formData.get("mesReferencia"),
  };
}

async function recalcularCompetenciaOrgao(params: {
  orgaoId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string;
}) {
  const inicio = new Date(
    Date.UTC(params.anoReferencia, params.mesReferencia - 1, 1),
  );
  const fim = new Date(Date.UTC(params.anoReferencia, params.mesReferencia, 1));

  const servidores = await prisma.servidor.findMany({
    where: {
      orgaoId: params.orgaoId,
      ativo: true,
      OR: [
        {
          apuracaoDiarias: {
            some: {
              dataReferencia: {
                gte: inicio,
                lt: fim,
              },
            },
          },
        },
        {
          marcacoes: {
            some: {
              dataReferencia: {
                gte: inicio,
                lt: fim,
              },
              status: {
                in: ["VALIDA", "PENDENTE", "AJUSTADA"],
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      apuracaoDiarias: {
        where: {
          dataReferencia: {
            gte: inicio,
            lt: fim,
          },
        },
        select: {
          dataReferencia: true,
        },
      },
      marcacoes: {
        where: {
          dataReferencia: {
            gte: inicio,
            lt: fim,
          },
          status: {
            in: ["VALIDA", "PENDENTE", "AJUSTADA"],
          },
        },
        select: {
          dataReferencia: true,
        },
      },
    },
  });

  for (const servidor of servidores) {
    const datas = new Map<string, Date>();

    for (const item of [
      ...servidor.apuracaoDiarias,
      ...servidor.marcacoes,
    ]) {
      const data = normalizarDataReferencia(item.dataReferencia);
      datas.set(data.toISOString().slice(0, 10), data);
    }

    for (const dataReferencia of datas.values()) {
      await recalcularDiaServidorService({
        servidorId: servidor.id,
        dataReferencia,
        usuarioIdAuditoria: params.usuarioIdAuditoria,
        origem: "ALTERACAO_REGULAMENTACAO_PONTO_ORGAO",
        ignorarBloqueioHomologacao: true,
      });
    }

    await regerarBancoHorasMesService({
      servidorId: servidor.id,
      anoReferencia: params.anoReferencia,
      mesReferencia: params.mesReferencia,
      usuarioIdAuditoria: params.usuarioIdAuditoria,
      origem: "ALTERACAO_REGULAMENTACAO_PONTO_ORGAO",
    });
  }

  return servidores.length;
}

export async function salvarRegulamentacaoPontoAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "regulamentacao-ponto:gerenciar:global",
  );
  const parsed = regulamentacaoSchema.safeParse(extrairDados(formData));

  if (!parsed.success) {
    throw new Error("Dados inválidos para a regulamentação de ponto.");
  }

  const { recalcularCompetencia, anoReferencia, mesReferencia, ...dados } =
    parsed.data;
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

  let servidoresRecalculados = 0;

  if (recalcularCompetencia) {
    servidoresRecalculados = await recalcularCompetenciaOrgao({
      orgaoId: dados.orgaoId,
      anoReferencia,
      mesReferencia,
      usuarioIdAuditoria: permissao.usuarioId,
    });
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
              servidoresRecalculados,
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
