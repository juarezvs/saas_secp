"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  registrarParecerOrcamentarioHorasExtrasSchema,
  type RegistrarParecerOrcamentarioHorasExtrasFormState,
  type RegistrarParecerOrcamentarioHorasExtrasInput,
} from "../schemas/horas-extras-orcamento.schema";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function decimalOuUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

function extrairDados(
  formData: FormData,
): Partial<RegistrarParecerOrcamentarioHorasExtrasInput> {
  const result = texto(formData, "result");

  return {
    requestId: texto(formData, "requestId"),
    result:
      result === "AVAILABLE" ||
      result === "PARTIALLY_AVAILABLE" ||
      result === "UNAVAILABLE" ||
      result === "NEEDS_INFORMATION"
        ? result
        : undefined,
    estimatedAmount: texto(formData, "estimatedAmount"),
    availableAmount: texto(formData, "availableAmount"),
    reservedAmount: texto(formData, "reservedAmount"),
    approvedMinutes: formData.get("approvedMinutes")
      ? Number(formData.get("approvedMinutes"))
      : undefined,
    budgetActionCode: texto(formData, "budgetActionCode") || undefined,
    budgetPlanCode: texto(formData, "budgetPlanCode") || undefined,
    commitmentReference: texto(formData, "commitmentReference") || undefined,
    seiProcessReference: texto(formData, "seiProcessReference") || undefined,
    notes: texto(formData, "notes"),
  };
}

function proximaEtapa(
  result: RegistrarParecerOrcamentarioHorasExtrasInput["result"],
) {
  if (result === "NEEDS_INFORMATION") {
    return "ANALISE_CHEFIA";
  }

  return "DELIBERACAO_FINAL";
}

async function proximaEtapaConfigurada(params: {
  workflowVersionId: string;
  fromStepCode: string;
  result: RegistrarParecerOrcamentarioHorasExtrasInput["result"];
}) {
  const actionCode =
    params.result === "NEEDS_INFORMATION" ? "RETURN" : "BUDGET_REVIEWED";
  const transition = await prisma.overtimeWorkflowTransition.findFirst({
    where: {
      workflowVersionId: params.workflowVersionId,
      fromStepCode: params.fromStepCode,
      actionCode,
    },
    select: {
      toStepCode: true,
    },
  });

  return transition?.toStepCode ?? proximaEtapa(params.result);
}

export async function registrarParecerOrcamentarioHorasExtrasAction(
  _estadoAnterior: RegistrarParecerOrcamentarioHorasExtrasFormState,
  formData: FormData,
): Promise<RegistrarParecerOrcamentarioHorasExtrasFormState> {
  const permissao = await exigirPermissao(
    "horas-extras:responder-orcamento:global",
  );
  const dados = extrairDados(formData);
  const parsed = registrarParecerOrcamentarioHorasExtrasSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do parecer orcamentario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const request = await prisma.overtimeRequest.findUnique({
    where: {
      id: parsed.data.requestId,
    },
  });

  if (!request) {
    return {
      sucesso: false,
      mensagem: "Solicitacao de horas extras nao encontrada.",
      campos: parsed.data,
    };
  }

  if (request.currentWorkflowStepCode !== "ANALISE_ORCAMENTARIA") {
    return {
      sucesso: false,
      mensagem: "A solicitacao nao esta na etapa de analise orcamentaria.",
      campos: parsed.data,
    };
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(request.orgaoId)
  ) {
    return {
      sucesso: false,
      mensagem: "A solicitacao pertence a um orgao fora do seu escopo.",
      campos: parsed.data,
    };
  }

  const nextStep = await proximaEtapaConfigurada({
    workflowVersionId: request.workflowVersionId,
    fromStepCode: request.currentWorkflowStepCode,
    result: parsed.data.result,
  });
  const nextStatus = "IN_WORKFLOW" as const;

  await prisma.$transaction(async (tx) => {
    const review = await tx.overtimeBudgetReview.create({
      data: {
        requestId: request.id,
        reviewerUserId: permissao.usuarioId,
        budgetUnitId: null,
        result: parsed.data.result,
        estimatedAmount: decimalOuUndefined(parsed.data.estimatedAmount),
        availableAmount: decimalOuUndefined(parsed.data.availableAmount),
        reservedAmount: decimalOuUndefined(parsed.data.reservedAmount),
        approvedMinutes: parsed.data.approvedMinutes ?? null,
        budgetActionCode: parsed.data.budgetActionCode ?? null,
        budgetPlanCode: parsed.data.budgetPlanCode ?? null,
        commitmentReference: parsed.data.commitmentReference ?? null,
        seiProcessReference: parsed.data.seiProcessReference ?? null,
        notes: parsed.data.notes,
      },
    });

    const atualizado = await tx.overtimeRequest.update({
      where: {
        id: request.id,
      },
      data: {
        budgetReviewResult: parsed.data.result,
        currentLifecycleStatus: nextStatus,
        currentWorkflowStepCode: nextStep,
      },
    });

    await tx.overtimeRequestHistory.create({
      data: {
        requestId: request.id,
        userId: permissao.usuarioId,
        action: "BUDGET_REVIEWED",
        fromStatus: request.currentLifecycleStatus,
        toStatus: atualizado.currentLifecycleStatus,
        fromStepCode: request.currentWorkflowStepCode,
        toStepCode: atualizado.currentWorkflowStepCode,
        reason: parsed.data.notes,
        metadata: {
          budgetReviewId: review.id,
          result: review.result,
          permissao: "horas-extras:responder-orcamento:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "OvertimeBudgetReview",
        entidadeId: review.id,
        acao: "HORAS_EXTRAS_PARECER_ORCAMENTARIO_REGISTRADO",
        dadosAntes: {
          requestId: request.id,
          status: request.currentLifecycleStatus,
          step: request.currentWorkflowStepCode,
        },
        dadosDepois: {
          requestId: request.id,
          result: review.result,
          approvedMinutes: review.approvedMinutes,
          availableAmount: review.availableAmount,
          status: atualizado.currentLifecycleStatus,
          step: atualizado.currentWorkflowStepCode,
        },
        metadados: {
          permissao: "horas-extras:responder-orcamento:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/orcamento/horas-extras");
  revalidatePath(`/orcamento/horas-extras/${request.id}`);
  revalidatePath("/gestao/horas-extras");
  redirect("/orcamento/horas-extras");
}
