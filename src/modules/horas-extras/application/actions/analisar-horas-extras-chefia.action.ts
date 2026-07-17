"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  analisarHorasExtrasChefiaSchema,
  type AnalisarHorasExtrasChefiaFormState,
  type AnalisarHorasExtrasChefiaInput,
} from "../schemas/horas-extras-analise-chefia.schema";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function extrairDados(formData: FormData): Partial<AnalisarHorasExtrasChefiaInput> {
  const action = texto(formData, "action");

  return {
    requestId: texto(formData, "requestId"),
    action:
      action === "RETURN" || action === "REJECT" || action === "FORWARD_BUDGET"
        ? action
        : undefined,
    reason: texto(formData, "reason"),
  };
}

function permissaoPorAcao(action: AnalisarHorasExtrasChefiaInput["action"]) {
  if (action === "RETURN") {
    return "horas-extras:devolver:global";
  }

  if (action === "REJECT") {
    return "horas-extras:rejeitar:global";
  }

  return "horas-extras:encaminhar-orcamento:chefia";
}

function destinoPorAcao(action: AnalisarHorasExtrasChefiaInput["action"]) {
  if (action === "RETURN") {
    return {
      status: "RETURNED" as const,
      step: "SERVIDOR_SOLICITANTE",
      timestampField: "returnedAt" as const,
      auditAction: "HORAS_EXTRAS_SOLICITACAO_DEVOLVIDA_CHEFIA",
    };
  }

  if (action === "REJECT") {
    return {
      status: "REJECTED" as const,
      step: null,
      timestampField: "rejectedAt" as const,
      auditAction: "HORAS_EXTRAS_SOLICITACAO_REJEITADA_CHEFIA",
    };
  }

  return {
    status: "IN_WORKFLOW" as const,
    step: "ANALISE_ORCAMENTARIA",
    timestampField: null,
    auditAction: "HORAS_EXTRAS_SOLICITACAO_ENCAMINHADA_ORCAMENTO",
  };
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
      mensagem: "Verifique os dados da análise.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const permissaoNecessaria = permissaoPorAcao(parsed.data.action);
  const permissao = await exigirPermissao(permissaoNecessaria);
  const destino = destinoPorAcao(parsed.data.action);
  const now = new Date();

  const request = await prisma.overtimeRequest.findUnique({
    where: {
      id: parsed.data.requestId,
    },
  });

  if (!request) {
    return {
      sucesso: false,
      mensagem: "Solicitação de horas extras não encontrada.",
      campos: parsed.data,
    };
  }

  if (request.currentWorkflowStepCode !== "ANALISE_CHEFIA") {
    return {
      sucesso: false,
      mensagem: "A solicitação não está na etapa de análise da chefia.",
      campos: parsed.data,
    };
  }

  if (!permissao.perfilAtivoEscopoGlobal && permissao.orgaoIds?.length) {
    if (!permissao.orgaoIds.includes(request.orgaoId)) {
      return {
        sucesso: false,
        mensagem: "A solicitação pertence a um órgão fora do seu escopo.",
        campos: parsed.data,
      };
    }
  }

  if (!permissao.perfilAtivoEscopoGlobal && permissao.usuarioId) {
    const unidadesSubordinadas =
      await listarIdsUnidadesSubordinadasPorUsuario(permissao.usuarioId);

    if (!unidadesSubordinadas.includes(request.organizationalUnitId)) {
      return {
        sucesso: false,
        mensagem: "A solicitação pertence a uma unidade fora da sua responsabilidade.",
        campos: parsed.data,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    const data =
      destino.timestampField === "returnedAt"
        ? { returnedAt: now }
        : destino.timestampField === "rejectedAt"
          ? { rejectedAt: now }
          : {};

    const atualizado = await tx.overtimeRequest.update({
      where: {
        id: request.id,
      },
      data: {
        currentLifecycleStatus: destino.status,
        currentWorkflowStepCode: destino.step,
        ...data,
      },
    });

    await tx.overtimeRequestHistory.create({
      data: {
        requestId: request.id,
        userId: permissao.usuarioId,
        action: parsed.data.action,
        fromStatus: request.currentLifecycleStatus,
        toStatus: destino.status,
        fromStepCode: request.currentWorkflowStepCode,
        toStepCode: destino.step,
        reason: parsed.data.reason,
        metadata: {
          permissao: permissaoNecessaria,
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "OvertimeRequest",
        entidadeId: request.id,
        acao: destino.auditAction,
        dadosAntes: {
          status: request.currentLifecycleStatus,
          step: request.currentWorkflowStepCode,
        },
        dadosDepois: {
          status: atualizado.currentLifecycleStatus,
          step: atualizado.currentWorkflowStepCode,
          reason: parsed.data.reason,
        },
        metadados: {
          permissao: permissaoNecessaria,
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/horas-extras");
  revalidatePath("/gestao/horas-extras");
  revalidatePath(`/gestao/horas-extras/${request.id}`);
  redirect("/gestao/horas-extras");
}
