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

type WorkflowStepConfig = {
  code: string;
  name: string;
  requiredPermission: string | null;
  allowsPartialApproval?: boolean;
};

type WorkflowTransitionConfig = {
  fromStepCode: string;
  toStepCode: string | null;
  actionCode: string;
  requiredPermission: string | null;
};

type WorkflowConfig = {
  steps: WorkflowStepConfig[];
  transitions: WorkflowTransitionConfig[];
};

const etapasPermitidas = new Map<string, Omit<WorkflowStepConfig, "code">>([
  [
    "SERVIDOR_SOLICITANTE",
    {
      name: "Servidor solicitante",
      requiredPermission: "horas-extras:solicitar:proprio",
      allowsPartialApproval: false,
    },
  ],
  [
    "ANALISE_CHEFIA",
    {
      name: "Análise da chefia",
      requiredPermission: "horas-extras:analisar:chefia",
      allowsPartialApproval: true,
    },
  ],
  [
    "ANALISE_ORCAMENTARIA",
    {
      name: "Análise orçamentária",
      requiredPermission: "horas-extras:responder-orcamento:global",
      allowsPartialApproval: true,
    },
  ],
  [
    "DELIBERACAO_FINAL",
    {
      name: "Deliberação final",
      requiredPermission: "horas-extras:deliberar:global",
      allowsPartialApproval: true,
    },
  ],
  [
    "EXECUCAO",
    {
      name: "Execução",
      requiredPermission: "horas-extras:visualizar-execucao:global",
      allowsPartialApproval: false,
    },
  ],
  [
    "FECHAMENTO",
    {
      name: "Fechamento",
      requiredPermission: "horas-extras:gerar-lote:global",
      allowsPartialApproval: false,
    },
  ],
  [
    "PAGAMENTO",
    {
      name: "Pagamento",
      requiredPermission: "horas-extras:visualizar-folha:global",
      allowsPartialApproval: false,
    },
  ],
]);

const acoesPermitidas = new Map<string, string | null>([
  ["SUBMIT", "horas-extras:solicitar:proprio"],
  ["RETURN", "horas-extras:devolver:global"],
  ["REJECT", "horas-extras:rejeitar:global"],
  ["FORWARD_BUDGET", "horas-extras:encaminhar-orcamento:chefia"],
  ["BUDGET_REVIEWED", "horas-extras:responder-orcamento:global"],
  ["APPROVE", "horas-extras:deliberar:global"],
  ["CLOSE_EXECUTION", "horas-extras:visualizar-execucao:global"],
  ["CLOSE_BATCH", "horas-extras:fechar-lote:global"],
]);
const permissoesPermitidas = new Set(
  Array.from(acoesPermitidas.values()).filter(
    (permissao): permissao is string => Boolean(permissao),
  ),
);

function workflowPadrao(): WorkflowConfig {
  return {
    steps: [
      "SERVIDOR_SOLICITANTE",
      "ANALISE_CHEFIA",
      "ANALISE_ORCAMENTARIA",
      "DELIBERACAO_FINAL",
      "EXECUCAO",
      "FECHAMENTO",
      "PAGAMENTO",
    ].map((code) => ({
      code,
      ...etapasPermitidas.get(code)!,
    })),
    transitions: [
      {
        fromStepCode: "SERVIDOR_SOLICITANTE",
        toStepCode: "ANALISE_CHEFIA",
        actionCode: "SUBMIT",
        requiredPermission: "horas-extras:solicitar:proprio",
      },
      {
        fromStepCode: "ANALISE_CHEFIA",
        toStepCode: "SERVIDOR_SOLICITANTE",
        actionCode: "RETURN",
        requiredPermission: "horas-extras:devolver:global",
      },
      {
        fromStepCode: "ANALISE_CHEFIA",
        toStepCode: "ANALISE_ORCAMENTARIA",
        actionCode: "FORWARD_BUDGET",
        requiredPermission: "horas-extras:encaminhar-orcamento:chefia",
      },
      {
        fromStepCode: "ANALISE_ORCAMENTARIA",
        toStepCode: "DELIBERACAO_FINAL",
        actionCode: "BUDGET_REVIEWED",
        requiredPermission: "horas-extras:responder-orcamento:global",
      },
      {
        fromStepCode: "DELIBERACAO_FINAL",
        toStepCode: "EXECUCAO",
        actionCode: "APPROVE",
        requiredPermission: "horas-extras:deliberar:global",
      },
      {
        fromStepCode: "EXECUCAO",
        toStepCode: "FECHAMENTO",
        actionCode: "CLOSE_EXECUTION",
        requiredPermission: "horas-extras:visualizar-execucao:global",
      },
      {
        fromStepCode: "FECHAMENTO",
        toStepCode: "PAGAMENTO",
        actionCode: "CLOSE_BATCH",
        requiredPermission: "horas-extras:fechar-lote:global",
      },
    ],
  };
}

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
    workflowConfig: texto(formData, "workflowConfig"),
  };
}

function rotuloEscopo(scopeUnitId: string | null) {
  return scopeUnitId ? "seccional" : "órgão";
}

function normalizarWorkflowConfig(valor?: string): WorkflowConfig {
  if (!valor) {
    return workflowPadrao();
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(valor);
  } catch {
    throw new Error("Configuração do fluxo inválida.");
  }

  if (
    !bruto ||
    typeof bruto !== "object" ||
    !Array.isArray((bruto as { steps?: unknown }).steps) ||
    !Array.isArray((bruto as { transitions?: unknown }).transitions)
  ) {
    throw new Error("Configuração do fluxo incompleta.");
  }

  const stepsBrutos = (
    bruto as { steps: Array<{ code?: unknown; requiredPermission?: unknown }> }
  ).steps;
  const steps = stepsBrutos.map((step) => String(step.code ?? "").trim());
  const codigosUnicos = new Set(steps);

  if (steps.length < 2 || codigosUnicos.size !== steps.length) {
    throw new Error("O fluxo deve ter pelo menos duas etapas sem repetição.");
  }

  if (steps[0] !== "SERVIDOR_SOLICITANTE") {
    throw new Error("A primeira etapa deve ser Servidor solicitante.");
  }

  for (const code of steps) {
    if (!etapasPermitidas.has(code)) {
      throw new Error(`Etapa não suportada no fluxo: ${code}.`);
    }
  }

  const transitions = (
    bruto as {
      transitions: Array<{
        fromStepCode?: unknown;
        toStepCode?: unknown;
        actionCode?: unknown;
      }>;
    }
  ).transitions.map((transition) => {
    const actionCode = String(transition.actionCode ?? "").trim();

    if (!acoesPermitidas.has(actionCode)) {
      throw new Error(`Ação não suportada no fluxo: ${actionCode}.`);
    }

    return {
      fromStepCode: String(transition.fromStepCode ?? "").trim(),
      toStepCode: transition.toStepCode
        ? String(transition.toStepCode).trim()
        : null,
      actionCode,
      requiredPermission: acoesPermitidas.get(actionCode) ?? null,
    };
  });

  if (!transitions.some((transition) => transition.actionCode === "SUBMIT")) {
    throw new Error("O fluxo deve ter uma ação de envio.");
  }

  const chaves = new Set<string>();
  for (const transition of transitions) {
    if (!codigosUnicos.has(transition.fromStepCode)) {
      throw new Error("Há transição saindo de etapa removida do fluxo.");
    }

    if (transition.toStepCode && !codigosUnicos.has(transition.toStepCode)) {
      throw new Error("Há transição apontando para etapa removida do fluxo.");
    }

    const chave = `${transition.fromStepCode}:${transition.actionCode}`;
    if (chaves.has(chave)) {
      throw new Error("Há ação repetida para a mesma etapa de origem.");
    }
    chaves.add(chave);
  }

  return {
    steps: steps.map((code, index) => {
      const etapaPadrao = etapasPermitidas.get(code)!;
      const permissao = String(
        stepsBrutos[index]?.requiredPermission ?? "",
      ).trim();

      return {
        code,
        ...etapaPadrao,
        requiredPermission: permissoesPermitidas.has(permissao)
          ? permissao
          : etapaPadrao.requiredPermission,
      };
    }),
    transitions,
  };
}

async function publicarWorkflowPadraoHorasExtras(params: {
  tx: TransactionClient;
  orgaoId: string;
  scopeUnitId: string | null;
  validFrom: Date;
  workflowConfig: WorkflowConfig;
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
        steps: params.workflowConfig.steps.map((step) => step.code),
        transitions: params.workflowConfig.transitions.map((transition) => ({
          fromStepCode: transition.fromStepCode,
          toStepCode: transition.toStepCode,
          actionCode: transition.actionCode,
        })),
      },
    },
  });

  const steps = [
    [
      "SERVIDOR_SOLICITANTE",
      "Servidor solicitante",
      1,
      "horas-extras:solicitar:proprio",
      false,
    ],
    [
      "ANALISE_CHEFIA",
      "Análise da chefia",
      2,
      "horas-extras:analisar:chefia",
      true,
    ],
    [
      "ANALISE_ORCAMENTARIA",
      "Análise orçamentária",
      3,
      "horas-extras:responder-orcamento:global",
      true,
    ],
    [
      "DELIBERACAO_FINAL",
      "Deliberação final",
      4,
      "horas-extras:deliberar:global",
      true,
    ],
    [
      "EXECUCAO",
      "Execução",
      5,
      "horas-extras:visualizar-execucao:global",
      false,
    ],
    ["FECHAMENTO", "Fechamento", 6, "horas-extras:gerar-lote:global", false],
    [
      "PAGAMENTO",
      "Pagamento",
      7,
      "horas-extras:visualizar-folha:global",
      false,
    ],
  ] as const;
  void steps;

  await params.tx.overtimeWorkflowStepDefinition.createMany({
    data: params.workflowConfig.steps.map((step, index) => ({
      workflowVersionId: workflowVersion.id,
      code: step.code,
      name: step.name,
      order: index + 1,
      requiredPermission: step.requiredPermission,
      allowsPartialApproval: Boolean(step.allowsPartialApproval),
    })),
  });

  const transitions = [
    [
      "SERVIDOR_SOLICITANTE",
      "ANALISE_CHEFIA",
      "SUBMIT",
      "horas-extras:solicitar:proprio",
    ],
    [
      "ANALISE_CHEFIA",
      "SERVIDOR_SOLICITANTE",
      "RETURN",
      "horas-extras:devolver:global",
    ],
    [
      "ANALISE_CHEFIA",
      "ANALISE_ORCAMENTARIA",
      "FORWARD_BUDGET",
      "horas-extras:encaminhar-orcamento:chefia",
    ],
    [
      "ANALISE_ORCAMENTARIA",
      "DELIBERACAO_FINAL",
      "BUDGET_REVIEWED",
      "horas-extras:responder-orcamento:global",
    ],
    [
      "DELIBERACAO_FINAL",
      "EXECUCAO",
      "APPROVE",
      "horas-extras:deliberar:global",
    ],
    [
      "EXECUCAO",
      "FECHAMENTO",
      "CLOSE_EXECUTION",
      "horas-extras:visualizar-execucao:global",
    ],
    [
      "FECHAMENTO",
      "PAGAMENTO",
      "CLOSE_BATCH",
      "horas-extras:fechar-lote:global",
    ],
  ] as const;
  void transitions;

  await params.tx.overtimeWorkflowTransition.createMany({
    data: params.workflowConfig.transitions
      .filter((transition) => transition.toStepCode)
      .map((transition) => ({
        workflowVersionId: workflowVersion.id,
        fromStepCode: transition.fromStepCode,
        toStepCode: transition.toStepCode!,
        actionCode: transition.actionCode,
        requiredPermission: transition.requiredPermission,
      })),
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
  let workflowConfig: WorkflowConfig;

  try {
    workflowConfig = normalizarWorkflowConfig(parsed.data.workflowConfig);
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Verifique a configuração do fluxo.",
      campos: parsed.data,
    };
  }

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
        mensagem:
          "A seccional/unidade selecionada não pertence ao órgão informado.",
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
        budgetReviewRequired: workflowConfig.steps.some(
          (step) => step.code === "ANALISE_ORCAMENTARIA",
        ),
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
      workflowConfig,
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
