"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "@/modules/recalculo/application/services/regerar-banco-horas-mes.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  acoesAnaliseChefiaHorasExtras,
  analisarHorasExtrasChefiaSchema,
  type AnalisarHorasExtrasChefiaFormState,
  type AnalisarHorasExtrasChefiaInput,
} from "../schemas/horas-extras-analise-chefia.schema";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const acoesPermitidasChefia = new Set<string>(acoesAnaliseChefiaHorasExtras);

function ehAcaoChefia(
  action: string,
): action is AnalisarHorasExtrasChefiaInput["action"] {
  return acoesPermitidasChefia.has(action);
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function extrairDados(
  formData: FormData,
): Partial<AnalisarHorasExtrasChefiaInput> {
  const action = texto(formData, "action");

  return {
    requestId: texto(formData, "requestId"),
    action: ehAcaoChefia(action) ? action : undefined,
    reason: texto(formData, "reason"),
  };
}

function dataIso(data: Date) {
  return data.toISOString().slice(0, 10);
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

function criarSnapshotFluxoSimplificado(
  request: NonNullable<Awaited<ReturnType<typeof buscarRequest>>>,
) {
  return {
    workflowVersionId: request.workflowVersionId,
    workflowCode: request.workflowVersion.definition.code,
    workflowVersion: request.workflowVersion.version,
    currentStepCode: request.currentWorkflowStepCode ?? null,
    fluxoOperacional: "CHEFIA_DEFERIR_INDEFERIR",
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

function mesesDasDatas(datas: Date[]) {
  const meses = new Map<string, { anoReferencia: number; mesReferencia: number }>();

  for (const data of datas) {
    const anoReferencia = data.getUTCFullYear();
    const mesReferencia = data.getUTCMonth() + 1;
    meses.set(`${anoReferencia}-${mesReferencia}`, {
      anoReferencia,
      mesReferencia,
    });
  }

  return Array.from(meses.values());
}

async function recalcularPeriodoDeferido(params: {
  servidorId: string;
  datas: Date[];
  usuarioId?: string | null;
}) {
  for (const dataReferencia of params.datas) {
    await recalcularDiaServidorService({
      servidorId: params.servidorId,
      dataReferencia,
      usuarioIdAuditoria: params.usuarioId ?? undefined,
      origem: "HORAS_EXTRAS_CHEFIA_DEFERIDA",
    });
  }

  for (const competencia of mesesDasDatas(params.datas)) {
    await regerarBancoHorasMesService({
      servidorId: params.servidorId,
      anoReferencia: competencia.anoReferencia,
      mesReferencia: competencia.mesReferencia,
      usuarioIdAuditoria: params.usuarioId ?? undefined,
      origem: "HORAS_EXTRAS_CHEFIA_DEFERIDA",
    });
  }
}

export async function analisarHorasExtrasChefiaAction(
  _estadoAnterior: AnalisarHorasExtrasChefiaFormState,
  formData: FormData,
): Promise<AnalisarHorasExtrasChefiaFormState> {
  const dados = extrairDados(formData);
  const parsed = analisarHorasExtrasChefiaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados da analise.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const permissao = await exigirPermissao("horas-extras:analisar:chefia");

  if (!permissao.usuarioId) {
    return {
      sucesso: false,
      mensagem: "Usuario autenticado nao identificado.",
      campos: parsed.data,
    };
  }

  const request = await buscarRequest(parsed.data.requestId);

  if (!request) {
    return {
      sucesso: false,
      mensagem: "Solicitacao de horas extras nao encontrada.",
      campos: parsed.data,
    };
  }

  if (
    request.currentLifecycleStatus !== "SUBMITTED" ||
    request.currentWorkflowStepCode !== "ANALISE_CHEFIA"
  ) {
    return {
      sucesso: false,
      mensagem: "A solicitacao nao esta pendente de analise da chefia.",
      campos: parsed.data,
    };
  }

  if (!permissao.perfilAtivoEscopoGlobal && permissao.orgaoIds?.length) {
    if (!permissao.orgaoIds.includes(request.orgaoId)) {
      return {
        sucesso: false,
        mensagem: "A solicitacao pertence a um orgao fora do seu escopo.",
        campos: parsed.data,
      };
    }
  }

  if (!permissao.perfilAtivoEscopoGlobal) {
    const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
      permissao.usuarioId,
    );

    if (!unidadesSubordinadas.includes(request.organizationalUnitId)) {
      return {
        sucesso: false,
        mensagem:
          "A solicitacao pertence a uma unidade fora da sua responsabilidade.",
        campos: parsed.data,
      };
    }
  }

  const aprovando = parsed.data.action === "APPROVE";
  const totalSolicitado = request.days.reduce(
    (total, day) => total + day.requestedMinutes,
    0,
  );
  const now = new Date();
  const policySnapshot = criarSnapshotPolitica(request);
  const workflowSnapshot = criarSnapshotFluxoSimplificado(request);

  await prisma.$transaction(async (tx) => {
    const decision = await tx.overtimeFinalDecision.create({
      data: {
        requestId: request.id,
        authorityUserId: permissao.usuarioId!,
        budgetReviewId: null,
        result: aprovando ? "APPROVED" : "REJECTED",
        justification: parsed.data.reason,
        requestedMinutes: totalSolicitado,
        approvedMinutes: aprovando ? totalSolicitado : 0,
        estimatedAmount: undefined,
        seiProcessReference: null,
        policySnapshot,
        workflowSnapshot,
        metadata: {
          origem: "ANALISE_DIRETA_CHEFIA",
          permissao: "horas-extras:analisar:chefia",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    const atualizado = await tx.overtimeRequest.update({
      where: {
        id: request.id,
      },
      data: {
        finalDecisionResult: aprovando ? "APPROVED" : "REJECTED",
        currentLifecycleStatus: aprovando ? "APPROVED" : "REJECTED",
        currentWorkflowStepCode: null,
        approvedAt: aprovando ? now : request.approvedAt,
        rejectedAt: aprovando ? request.rejectedAt : now,
      },
    });

    for (const day of request.days) {
      await tx.overtimeRequestDay.update({
        where: {
          id: day.id,
        },
        data: {
          approvedMinutes: aprovando ? day.requestedMinutes : 0,
          approvedStartTime: aprovando ? day.requestedStartTime : null,
          approvedEndTime: aprovando ? day.requestedEndTime : null,
          ratePercentSnapshot: aprovando
            ? obterPercentualDia(request, day.dayTypeSnapshot)
            : day.ratePercentSnapshot,
          requestDecision: aprovando ? "APPROVED" : "REJECTED",
          approvalReason: parsed.data.reason,
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
          status: "ACTIVE",
          validFrom: request.periodStart,
          validUntil: request.periodEnd,
          totalApprovedMinutes: totalSolicitado,
          policySnapshot,
          workflowSnapshot,
          days: {
            create: request.days.map((day) => ({
              requestDayId: day.id,
              date: day.date,
              approvedStartTime: day.requestedStartTime,
              approvedEndTime: day.requestedEndTime,
              approvedMinutes: day.requestedMinutes,
              dayType: day.dayTypeSnapshot,
              ratePercent: obterPercentualDia(request, day.dayTypeSnapshot),
              metadata: {
                requestedMinutes: day.requestedMinutes,
                origem: "ANALISE_DIRETA_CHEFIA",
              },
            })),
          },
        },
      });

      authorizationId = authorization.id;
    }

    await tx.overtimeRequestHistory.create({
      data: {
        requestId: request.id,
        userId: permissao.usuarioId,
        action: aprovando ? "APPROVE" : "REJECT",
        fromStatus: request.currentLifecycleStatus,
        toStatus: atualizado.currentLifecycleStatus,
        fromStepCode: request.currentWorkflowStepCode,
        toStepCode: null,
        reason: parsed.data.reason,
        metadata: {
          decisionId: decision.id,
          authorizationId,
          approvedMinutes: aprovando ? totalSolicitado : 0,
          permissao: "horas-extras:analisar:chefia",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "OvertimeRequest",
        entidadeId: request.id,
        acao: aprovando
          ? "HORAS_EXTRAS_DEFERIDA_CHEFIA"
          : "HORAS_EXTRAS_INDEFERIDA_CHEFIA",
        dadosAntes: {
          status: request.currentLifecycleStatus,
          step: request.currentWorkflowStepCode,
        },
        dadosDepois: {
          status: atualizado.currentLifecycleStatus,
          step: atualizado.currentWorkflowStepCode,
          authorizationId,
          totalSolicitado,
          aprovadoMinutos: aprovando ? totalSolicitado : 0,
          datas: request.days.map((day) => dataIso(day.date)),
        },
        metadados: {
          permissao: "horas-extras:analisar:chefia",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  if (aprovando) {
    try {
      await recalcularPeriodoDeferido({
        servidorId: request.employeeId,
        datas: request.days.map((day) => day.date),
        usuarioId: permissao.usuarioId,
      });
    } catch (error) {
      return {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? `Solicitacao deferida, mas nao foi possivel recalcular o espelho automaticamente: ${error.message}`
            : "Solicitacao deferida, mas nao foi possivel recalcular o espelho automaticamente.",
        campos: parsed.data,
      };
    }
  }

  revalidatePath("/horas-extras");
  revalidatePath("/gestao/horas-extras");
  revalidatePath(`/gestao/horas-extras/${request.id}`);
  revalidatePath(`/espelho-ponto?servidorId=${request.employeeId}`);
  redirect("/gestao/horas-extras");
}
