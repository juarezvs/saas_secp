"use server";

import { revalidatePath } from "next/cache";
import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  configurarPoliticaHorasExtrasSchema,
  type ConfigurarPoliticaHorasExtrasFormState,
  type ConfigurarPoliticaHorasExtrasInput,
} from "../schemas/horas-extras-politica.schema";

const CODIGO_POLITICA_PADRAO = "POLITICA_HE_JF_REFERENCIA";
const CODIGO_WORKFLOW_PADRAO = "FLUXO_HE_CHEFIA_ORCAMENTO_DELIBERACAO";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function numero(formData: FormData, campo: string) {
  return Number(formData.get(campo) ?? 0);
}

function extrairDados(
  formData: FormData,
): Partial<ConfigurarPoliticaHorasExtrasInput> {
  return {
    orgaoId: texto(formData, "orgaoId"),
    scopeUnitId: texto(formData, "scopeUnitId"),
    validFrom: texto(formData, "validFrom"),
    maxDailyWeekdayMinutes: numero(formData, "maxDailyWeekdayMinutes"),
    maxDailyWeekendHolidayMinutes: numero(
      formData,
      "maxDailyWeekendHolidayMinutes",
    ),
    maxMonthlyMinutes: numero(formData, "maxMonthlyMinutes"),
    maxAnnualMinutes: numero(formData, "maxAnnualMinutes"),
    divisorMinutes: numero(formData, "divisorMinutes"),
    rateDiaUtil: numero(formData, "rateDiaUtil"),
    rateSabado: numero(formData, "rateSabado"),
    rateDomingo: numero(formData, "rateDomingo"),
    rateFeriado: numero(formData, "rateFeriado"),
  };
}

function rotuloEscopo(scopeUnitId: string | null) {
  return scopeUnitId ? "seccional" : "órgão";
}

async function publicarWorkflowPadraoHorasExtras(params: {
  tx: TransactionClient;
  orgaoId: string;
  scopeUnitId: string | null;
  validFrom: Date;
}) {
  const definition =
    (await params.tx.overtimeWorkflowDefinition.findFirst({
      where: {
        orgaoId: params.orgaoId,
        code: CODIGO_WORKFLOW_PADRAO,
        scopeUnitId: params.scopeUnitId,
      },
    })) ??
    (await params.tx.overtimeWorkflowDefinition.create({
      data: {
        orgaoId: params.orgaoId,
        scopeUnitId: params.scopeUnitId,
        code: CODIGO_WORKFLOW_PADRAO,
        name: params.scopeUnitId
          ? "Chefia, orçamento e deliberação final - seccional"
          : "Chefia, orçamento e deliberação final",
        description:
          "Fluxo padrão para solicitação, análise, parecer, deliberação, execução, fechamento e pagamento de serviço extraordinário.",
        active: true,
      },
    }));

  await params.tx.overtimeWorkflowDefinition.update({
    where: {
      id: definition.id,
    },
    data: {
      active: true,
      name: params.scopeUnitId
        ? "Chefia, orçamento e deliberação final - seccional"
        : "Chefia, orçamento e deliberação final",
      description:
        "Fluxo padrão para solicitação, análise, parecer, deliberação, execução, fechamento e pagamento de serviço extraordinário.",
    },
  });

  const versaoAtual = await params.tx.overtimeWorkflowVersion.findFirst({
    where: {
      definitionId: definition.id,
      active: true,
    },
    orderBy: {
      version: "desc",
    },
  });
  const maiorVersao = await params.tx.overtimeWorkflowVersion.findFirst({
    where: {
      definitionId: definition.id,
    },
    orderBy: {
      version: "desc",
    },
  });

  if (versaoAtual) {
    await params.tx.overtimeWorkflowVersion.update({
      where: {
        id: versaoAtual.id,
      },
      data: {
        active: false,
        validUntil: params.validFrom,
      },
    });
  }

  const workflowVersion = await params.tx.overtimeWorkflowVersion.create({
    data: {
      definitionId: definition.id,
      orgaoId: params.orgaoId,
      scopeUnitId: params.scopeUnitId,
      version: (maiorVersao?.version ?? 0) + 1,
      validFrom: params.validFrom,
      initialStepCode: "SERVIDOR_SOLICITANTE",
      active: true,
      snapshot: {
        origem: "SECP_ADMIN",
        escopo: rotuloEscopo(params.scopeUnitId),
        scopeUnitId: params.scopeUnitId,
        template: definition.code,
      },
    },
  });

  const steps = [
    ["SERVIDOR_SOLICITANTE", "Servidor solicitante", 1, "horas-extras:solicitar:proprio", false],
    ["ANALISE_CHEFIA", "Análise da chefia", 2, "horas-extras:analisar:chefia", true],
    ["ANALISE_ORCAMENTARIA", "Análise orçamentária", 3, "horas-extras:responder-orcamento:global", true],
    ["DELIBERACAO_FINAL", "Deliberação final", 4, "horas-extras:deliberar:global", true],
    ["EXECUCAO", "Execução", 5, "horas-extras:visualizar-execucao:global", false],
    ["FECHAMENTO", "Fechamento", 6, "horas-extras:gerar-lote:global", false],
    ["PAGAMENTO", "Pagamento", 7, "horas-extras:visualizar-folha:global", false],
  ] as const;

  await params.tx.overtimeWorkflowStepDefinition.createMany({
    data: steps.map(([code, name, order, requiredPermission, allowsPartialApproval]) => ({
      workflowVersionId: workflowVersion.id,
      code,
      name,
      order,
      requiredPermission,
      allowsPartialApproval,
    })),
  });

  const transitions = [
    ["SERVIDOR_SOLICITANTE", "ANALISE_CHEFIA", "SUBMIT", "horas-extras:solicitar:proprio"],
    ["ANALISE_CHEFIA", "SERVIDOR_SOLICITANTE", "RETURN", "horas-extras:devolver:global"],
    ["ANALISE_CHEFIA", "ANALISE_ORCAMENTARIA", "FORWARD_BUDGET", "horas-extras:encaminhar-orcamento:chefia"],
    ["ANALISE_ORCAMENTARIA", "DELIBERACAO_FINAL", "BUDGET_REVIEWED", "horas-extras:responder-orcamento:global"],
    ["DELIBERACAO_FINAL", "EXECUCAO", "APPROVE", "horas-extras:deliberar:global"],
    ["EXECUCAO", "FECHAMENTO", "CLOSE_EXECUTION", "horas-extras:visualizar-execucao:global"],
    ["FECHAMENTO", "PAGAMENTO", "CLOSE_BATCH", "horas-extras:fechar-lote:global"],
  ] as const;

  await params.tx.overtimeWorkflowTransition.createMany({
    data: transitions.map(
      ([fromStepCode, toStepCode, actionCode, requiredPermission]) => ({
        workflowVersionId: workflowVersion.id,
        fromStepCode,
        toStepCode,
        actionCode,
        requiredPermission,
      }),
    ),
  });

  return workflowVersion;
}

export async function configurarPoliticaHorasExtrasAction(
  _estadoAnterior: ConfigurarPoliticaHorasExtrasFormState,
  formData: FormData,
): Promise<ConfigurarPoliticaHorasExtrasFormState> {
  const dados = extrairDados(formData);
  const parsed = configurarPoliticaHorasExtrasSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados da política.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const permissao = await exigirPermissao(
    "horas-extras:configurar-politica:global",
  );

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(parsed.data.orgaoId)
  ) {
    return {
      sucesso: false,
      mensagem: "O órgão selecionado está fora do seu escopo.",
      campos: parsed.data,
    };
  }

  const validFrom = new Date(`${parsed.data.validFrom}T00:00:00.000Z`);
  const scopeUnitId = parsed.data.scopeUnitId || null;

  if (scopeUnitId) {
    const unidade = await prisma.unidadeOrganizacional.findFirst({
      where: {
        id: scopeUnitId,
        orgaoId: parsed.data.orgaoId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!unidade) {
      return {
        sucesso: false,
        mensagem: "A seccional/unidade selecionada não pertence ao órgão informado.",
        campos: parsed.data,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const policy =
      (await tx.overtimePolicy.findFirst({
        where: {
          orgaoId: parsed.data.orgaoId,
          code: CODIGO_POLITICA_PADRAO,
          scopeUnitId,
        },
      })) ??
      (await tx.overtimePolicy.create({
        data: {
          orgaoId: parsed.data.orgaoId,
          scopeUnitId,
          code: CODIGO_POLITICA_PADRAO,
          name: scopeUnitId
            ? "Política de serviço extraordinário - seccional"
            : "Política de serviço extraordinário",
          description: "Política configurada pelo SECP.",
          active: true,
        },
      }));

    await tx.overtimePolicy.update({
      where: {
        id: policy.id,
      },
      data: {
        active: true,
        name: scopeUnitId
          ? "Política de serviço extraordinário - seccional"
          : "Política de serviço extraordinário",
        description: "Política configurada pelo SECP.",
      },
    });

    const versaoAtual = await tx.overtimePolicyVersion.findFirst({
      where: {
        policyId: policy.id,
        active: true,
      },
      orderBy: {
        version: "desc",
      },
    });
    const maiorVersao = await tx.overtimePolicyVersion.findFirst({
      where: {
        policyId: policy.id,
      },
      orderBy: {
        version: "desc",
      },
    });

    if (versaoAtual) {
      await tx.overtimePolicyVersion.update({
        where: {
          id: versaoAtual.id,
        },
        data: {
          active: false,
          validUntil: validFrom,
        },
      });
    }

    const novaVersao = await tx.overtimePolicyVersion.create({
      data: {
        policyId: policy.id,
        orgaoId: parsed.data.orgaoId,
        scopeUnitId,
        version: (maiorVersao?.version ?? 0) + 1,
        validFrom,
        active: true,
        divisorMinutes: parsed.data.divisorMinutes,
        monthlyLimitMinutes: parsed.data.maxMonthlyMinutes,
        annualLimitMinutes: parsed.data.maxAnnualMinutes,
        budgetReviewRequired: true,
        snapshot: {
          origem: "SECP_ADMIN",
          escopo: rotuloEscopo(scopeUnitId),
          scopeUnitId,
        },
        rateRules: {
          create: [
            {
              dayType: "DIA_UTIL",
              ratePercent: parsed.data.rateDiaUtil,
              dailyLimitMinutes: parsed.data.maxDailyWeekdayMinutes,
            },
            {
              dayType: "SABADO",
              ratePercent: parsed.data.rateSabado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "DOMINGO",
              ratePercent: parsed.data.rateDomingo,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "FERIADO_NACIONAL",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "FERIADO_ESTADUAL",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "FERIADO_MUNICIPAL",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "FERIADO_REGIMENTAL",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "PONTO_FACULTATIVO",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
            {
              dayType: "RECESSO",
              ratePercent: parsed.data.rateFeriado,
              dailyLimitMinutes: parsed.data.maxDailyWeekendHolidayMinutes,
            },
          ],
        },
      },
    });

    const workflowVersion = await publicarWorkflowPadraoHorasExtras({
      tx,
      orgaoId: parsed.data.orgaoId,
      scopeUnitId,
      validFrom,
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId ?? null,
        entidade: "OvertimePolicyVersion",
        entidadeId: novaVersao.id,
        acao: "HORAS_EXTRAS_POLITICA_CONFIGURADA",
        ...(versaoAtual
          ? {
              dadosAntes: {
                policyVersionId: versaoAtual.id,
                version: versaoAtual.version,
              },
            }
          : {}),
        dadosDepois: {
          policyVersionId: novaVersao.id,
          version: novaVersao.version,
          orgaoId: parsed.data.orgaoId,
          scopeUnitId,
          workflowVersionId: workflowVersion.id,
        },
        metadados: {
          permissao: "horas-extras:configurar-politica:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/administracao/horas-extras");

  return {
    sucesso: true,
    mensagem: scopeUnitId
      ? "Política e fluxo da seccional atualizados."
      : "Política e fluxo gerais do órgão atualizados.",
    campos: parsed.data,
  };
}
