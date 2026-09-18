"use server";

import { auth } from "@/auth";
import { enfileirarRecalculoEspelhoPonto } from "../queues/recalcular-espelho-ponto-queue";
import { obterProcessamentoEspelhoPonto } from "../services/processamento-espelho-ponto.service";

export type EstadoProcessamentoEspelho = {
  status: "PENDENTE" | "PROCESSANDO" | "ATUALIZADO" | "FALHA" | "AUSENTE";
  atualizadoEm: string | null;
  erro: string | null;
};

function podeRecalcular(permissoes: string[]) {
  return (
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("banco-horas:gerenciar:global")
  );
}

function lerParametros(formData: FormData) {
  return {
    servidorId: String(formData.get("servidorId") ?? ""),
    anoReferencia: Number(formData.get("anoReferencia") ?? 0),
    mesReferencia: Number(formData.get("mesReferencia") ?? 0),
  };
}

export async function recalcularMesServidorAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return { sucesso: false, mensagem: "Sua sessao expirou." };
  }

  if (!podeRecalcular(session.user.perfilAtivo?.permissoes ?? [])) {
    return {
      sucesso: false,
      mensagem: "Voce nao tem permissao para recalcular este mes.",
    };
  }

  const params = lerParametros(formData);
  if (!params.servidorId || !params.anoReferencia || !params.mesReferencia) {
    return { sucesso: false, mensagem: "Servidor ou competencia invalida." };
  }

  try {
    await enfileirarRecalculoEspelhoPonto({
      ...params,
      motivo: "RECALCULO_MANUAL_MES",
      solicitadoPorId: session.user.id,
      forcar: true,
    });
  } catch (error) {
    console.error("[ESPELHO PONTO] Falha ao enfileirar recalculo manual", error);
    return {
      sucesso: false,
      mensagem: "Nao foi possivel iniciar o recalculo agora.",
    };
  }

  return { sucesso: true, mensagem: "Recalculo enviado para processamento." };
}

export async function consultarProcessamentoEspelhoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return null;

  const params = lerParametros(formData);
  if (!params.servidorId || !params.anoReferencia || !params.mesReferencia) {
    return null;
  }

  const processamento = await obterProcessamentoEspelhoPonto(params);
  if (!processamento) {
    return {
      status: "AUSENTE",
      atualizadoEm: null,
      erro: null,
    } satisfies EstadoProcessamentoEspelho;
  }

  return {
    status: processamento.status,
    atualizadoEm: processamento.concluidoEm?.toISOString() ?? null,
    erro: processamento.erro,
  } satisfies EstadoProcessamentoEspelho;
}
