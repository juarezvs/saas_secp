"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  registrarDeliberacaoHorasExtrasSchema,
  type RegistrarDeliberacaoHorasExtrasFormState,
  type RegistrarDeliberacaoHorasExtrasInput,
} from "../schemas/horas-extras-deliberacao.schema";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function decimalOuUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

function extrairDados(
  formData: FormData,
): Partial<RegistrarDeliberacaoHorasExtrasInput> {
  const result = texto(formData, "result");

  return {
    requestId: texto(formData, "requestId"),
    result:
      result === "APPROVED" ||
      result === "PARTIALLY_APPROVED" ||
      result === "REJECTED" ||
      result === "RETURNED"
        ? result
        : undefined,
    approvedMinutes: formData.get("approvedMinutes")
      ? Number(formData.get("approvedMinutes"))
      : 0,
    estimatedAmount: texto(formData, "estimatedAmount"),
    seiProcessReference: texto(formData, "seiProcessReference") || undefined,
    justification: texto(formData, "justification"),
  };
}

function criarSnapshotPolitica(
  request: NonNullable<Awaited<ReturnType<typeof buscarRequest>>>,
) {
  return {
    policyVersionId: request.policyVersionId,
    policyCode: request.policyVersion.policy.code,
    policyVersion: request.policyVersion.version,
    divisorMinutes: request.policyVersion.divisorMinutes.toString(),
    rateRules: request.policyVersion.rateRules.map((rule) => ({
      dayType: rule.dayType,
      ratePercent: rule.ratePercent.toString(),
      active: rule.active,
    })),
  } satisfies JsonValue;
}

function criarSnapshotFluxo(
  request: NonNullable<Awaited<ReturnType<typeof buscarRequest>>>,
) {
  return {
    workflowVersionId: request.workflowVersionId,
    workflowCode: request.workflowVersion.definition.code,
    workflowVersion: request.workflowVersion.version,
    currentStepCode: request.currentWorkflowStepCode ?? null,
  } satisfies JsonValue;
}

function obterPercentualDia(
  request: NonNullable<Awaited<ReturnType<typeof buscarRequest>>>,
  dayType: string,
) {
  const rule = request.policyVersion.rateRules.find(
    (item) => item.dayType === dayType && item.active,
  );

  return rule?.ratePercent ?? 0;
}

function calcularDiasAutorizados(
  request: NonNullable<Awaited<ReturnType<typeof buscarRequest>>>,
  approvedMinutes: number,
) {
  let restante = approvedMinutes;

  return request.days.flatMap((day) => {
    if (restante <= 0) {
      return [];
    }

    const minutosDia = Math.min(day.requestedMinutes, restante);
    restante -= minutosDia;

    return [
      {
        requestDayId: day.id,
        date: day.date,
        approvedStartTime: day.requestedStartTime,
        approvedEndTime: day.requestedEndTime,
        approvedMinutes: minutosDia,
        dayType: day.dayTypeSnapshot,
        ratePercent: obterPercentualDia(request, day.dayTypeSnapshot),
        metadata: {
          requestedMinutes: day.requestedMinutes,
        },
      },
    ];
  });
}

async function buscarRequest(id: string) {
  return prisma.overtimeRequest.findUnique({
    where: {
      id,
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      budgetReviews: {
        orderBy: {
          reviewedAt: "desc",
        },
        take: 1,
      },
      policyVersion: {
        include: {
          policy: true,
          rateRules: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
        },
      },
    },
  });
}

async function proximaEtapaAprovacaoConfigurada(params: {
  workflowVersionId: string;
  fromStepCode: string;
}) {
  const transition = await prisma.overtimeWorkflowTransition.findFirst({
    where: {
      workflowVersionId: params.workflowVersionId,
      fromStepCode: params.fromStepCode,
      actionCode: "APPROVE",
    },
    select: {
      toStepCode: true,
    },
  });

  return transition?.toStepCode ?? "EXECUCAO";
}

export async function registrarDeliberacaoHorasExtrasAction(
  _estadoAnterior: RegistrarDeliberacaoHorasExtrasFormState,
  formData: FormData,
): Promise<RegistrarDeliberacaoHorasExtrasFormState> {
  const dados = extrairDados(formData);
  const parsed = registrarDeliberacaoHorasExtrasSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados da deliberacao.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const permissao = await exigirPermissao("horas-extras:deliberar:global");
  if (!permissao.usuarioId) {
    return {
      sucesso: false,
      mensagem:
        "Usuario autenticado nao identificado para registrar a deliberacao.",
      campos: parsed.data,
    };
  }

  const usuarioId = permissao.usuarioId;
  const request = await buscarRequest(parsed.data.requestId);

  if (!request) {
    return {
      sucesso: false,
      mensagem: "Solicitacao de horas extras nao encontrada.",
      campos: parsed.data,
    };
  }

  if (request.currentWorkflowStepCode !== "DELIBERACAO_FINAL") {
    return {
      sucesso: false,
      mensagem: "A solicitacao nao esta na etapa de deliberacao final.",
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

  const totalSolicitado = request.days.reduce(
    (total, day) => total + day.requestedMinutes,
    0,
  );
  const parecer = request.budgetReviews[0];

  const exigeParecerOrcamentario = request.policyVersion.budgetReviewRequired;

  if (
    exigeParecerOrcamentario &&
    (!parecer || parecer.result === "NEEDS_INFORMATION")
  ) {
    return {
      sucesso: false,
      mensagem:
        "Registre um parecer orcamentario conclusivo antes da deliberacao.",
      campos: parsed.data,
    };
  }

  const limiteOrcamentario =
    parecer?.result === "UNAVAILABLE"
      ? 0
      : (parecer?.approvedMinutes ?? totalSolicitado);
  const aprovando =
    parsed.data.result === "APPROVED" ||
    parsed.data.result === "PARTIALLY_APPROVED";

  if (!aprovando && parsed.data.approvedMinutes > 0) {
    return {
      sucesso: false,
      mensagem: "Decisao sem aprovacao deve informar zero minuto aprovado.",
      campos: parsed.data,
    };
  }

  if (aprovando && parsed.data.approvedMinutes <= 0) {
    return {
      sucesso: false,
      mensagem: "Informe os minutos aprovados para gerar a autorizacao.",
      campos: parsed.data,
    };
  }

  if (parsed.data.approvedMinutes > totalSolicitado) {
    return {
      sucesso: false,
      mensagem: "Os minutos aprovados nao podem superar o total solicitado.",
      campos: parsed.data,
    };
  }

  if (parsed.data.approvedMinutes > limiteOrcamentario) {
    return {
      sucesso: false,
      mensagem: "Os minutos aprovados nao podem superar o limite orcamentario.",
      campos: parsed.data,
    };
  }

  const resultadoFinal =
    aprovando && parsed.data.approvedMinutes < totalSolicitado
      ? "PARTIALLY_APPROVED"
      : parsed.data.result;
  const now = new Date();
  const policySnapshot = criarSnapshotPolitica(request);
  const workflowSnapshot = criarSnapshotFluxo(request);
  const diasAutorizados = aprovando
    ? calcularDiasAutorizados(request, parsed.data.approvedMinutes)
    : [];
  const etapaAposAprovacao = await proximaEtapaAprovacaoConfigurada({
    workflowVersionId: request.workflowVersionId,
    fromStepCode: request.currentWorkflowStepCode,
  });

  await prisma.$transaction(async (tx) => {
    const decision = await tx.overtimeFinalDecision.create({
      data: {
        requestId: request.id,
        authorityUserId: usuarioId,
        budgetReviewId: parecer?.id ?? null,
        result: resultadoFinal,
        justification: parsed.data.justification,
        requestedMinutes: totalSolicitado,
        approvedMinutes: parsed.data.approvedMinutes,
        estimatedAmount: decimalOuUndefined(parsed.data.estimatedAmount),
        seiProcessReference: parsed.data.seiProcessReference ?? null,
        policySnapshot,
        workflowSnapshot,
        metadata: {
          budgetReviewResult: parecer?.result ?? null,
          budgetApprovedMinutes: parecer?.approvedMinutes ?? null,
          permissao: "horas-extras:deliberar:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    const novoStatus =
      resultadoFinal === "APPROVED"
        ? "APPROVED"
        : resultadoFinal === "PARTIALLY_APPROVED"
          ? "PARTIALLY_APPROVED"
          : resultadoFinal === "RETURNED"
            ? "RETURNED"
            : "REJECTED";
    const novaEtapa = aprovando
      ? etapaAposAprovacao
      : resultadoFinal === "RETURNED"
        ? "ANALISE_CHEFIA"
        : null;

    const atualizado = await tx.overtimeRequest.update({
      where: {
        id: request.id,
      },
      data: {
        finalDecisionResult: resultadoFinal,
        currentLifecycleStatus: novoStatus,
        currentWorkflowStepCode: novaEtapa,
        approvedAt: aprovando ? now : null,
        returnedAt: resultadoFinal === "RETURNED" ? now : request.returnedAt,
        rejectedAt: resultadoFinal === "REJECTED" ? now : request.rejectedAt,
      },
    });

    for (const day of request.days) {
      const autorizado = diasAutorizados.find(
        (item) => item.requestDayId === day.id,
      );

      await tx.overtimeRequestDay.update({
        where: {
          id: day.id,
        },
        data: {
          approvedMinutes: autorizado?.approvedMinutes ?? 0,
          approvedStartTime: autorizado?.approvedStartTime ?? null,
          approvedEndTime: autorizado?.approvedEndTime ?? null,
          ratePercentSnapshot: autorizado?.ratePercent ?? null,
          requestDecision: autorizado
            ? autorizado.approvedMinutes === day.requestedMinutes
              ? "APPROVED"
              : "PARTIALLY_APPROVED"
            : aprovando
              ? "REJECTED"
              : resultadoFinal === "RETURNED"
                ? "REQUESTED"
                : "REJECTED",
          approvalReason: parsed.data.justification,
        },
      });
    }

    let authorizationId: string | null = null;

    if (aprovando) {
      const authorization = await tx.overtimeAuthorization.create({
        data: {
          orgaoId: request.orgaoId,
          requestId: request.id,
          decisionId: decision.id,
          employeeId: request.employeeId,
          validFrom: request.periodStart,
          validUntil: request.periodEnd,
          totalApprovedMinutes: parsed.data.approvedMinutes,
          policySnapshot,
          workflowSnapshot,
          days: {
            create: diasAutorizados.map((day) => ({
              requestDayId: day.requestDayId,
              date: day.date,
              approvedStartTime: day.approvedStartTime,
              approvedEndTime: day.approvedEndTime,
              approvedMinutes: day.approvedMinutes,
              dayType: day.dayType,
              ratePercent: day.ratePercent,
              metadata: day.metadata,
            })),
          },
        },
      });

      authorizationId = authorization.id;
    }

    await tx.overtimeRequestHistory.create({
      data: {
        requestId: request.id,
        userId: usuarioId,
        action: "FINAL_DECISION",
        fromStatus: request.currentLifecycleStatus,
        toStatus: atualizado.currentLifecycleStatus,
        fromStepCode: request.currentWorkflowStepCode,
        toStepCode: atualizado.currentWorkflowStepCode,
        reason: parsed.data.justification,
        metadata: {
          decisionId: decision.id,
          authorizationId,
          result: resultadoFinal,
          approvedMinutes: parsed.data.approvedMinutes,
          permissao: "horas-extras:deliberar:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: "OvertimeFinalDecision",
        entidadeId: decision.id,
        acao: "HORAS_EXTRAS_DELIBERACAO_FINAL_REGISTRADA",
        dadosAntes: {
          requestId: request.id,
          status: request.currentLifecycleStatus,
          step: request.currentWorkflowStepCode,
        },
        dadosDepois: {
          requestId: request.id,
          result: resultadoFinal,
          approvedMinutes: parsed.data.approvedMinutes,
          authorizationId,
          status: atualizado.currentLifecycleStatus,
          step: atualizado.currentWorkflowStepCode,
        },
        metadados: {
          permissao: "horas-extras:deliberar:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/deliberacao/horas-extras");
  revalidatePath(`/deliberacao/horas-extras/${request.id}`);
  revalidatePath("/horas-extras");
  redirect("/deliberacao/horas-extras");
}
