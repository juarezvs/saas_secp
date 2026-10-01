"use server";

import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { enfileirarRecalculoEspelhoPonto } from "../queues/recalcular-espelho-ponto-queue";
import { obterProcessamentoEspelhoPonto } from "../services/processamento-espelho-ponto.service";
import { recalculoEspelhoPontoDisponivel } from "../services/recalculo-worker-env";

export type EstadoProcessamentoEspelho = {
  status: "PENDENTE" | "PROCESSANDO" | "ATUALIZADO" | "FALHA" | "AUSENTE";
  atualizadoEm: string | null;
  erro: string | null;
};

function podeSolicitarRecalculo(permissoes: string[]) {
  return (
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("apuracao:recalcular:seccional") ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("minha-equipe:consultar:chefia") ||
    permissoes.includes("banco-horas:gerenciar:global")
  );
}

async function usuarioPodeRecalcularServidor(params: {
  usuarioId: string;
  perfilAtivoCodigo?: string | null;
  servidorId: string;
  permissoes: string[];
}) {
  if (
    params.permissoes.includes("apuracao:recalcular:global") ||
    params.permissoes.includes("apuracao:recalcular:seccional") ||
    params.permissoes.includes("banco-horas:gerenciar:global")
  ) {
    const escopo = await obterEscopoOrgaoDaSessao();

    if (escopo.global) {
      return true;
    }

    const servidor = await prisma.servidor.findUnique({
      where: { id: params.servidorId },
      select: { orgaoId: true },
    });

    return Boolean(
      servidor?.orgaoId && escopo.orgaoIds.includes(servidor.orgaoId),
    );
  }

  if (
    perfilAtivoEhChefia({
      perfilAtivoCodigo: params.perfilAtivoCodigo,
      permissoes: params.permissoes,
    })
  ) {
    const [servidorProprio, servidoresChefia] = await Promise.all([
      buscarServidorComUsuarioPorUsuarioId(params.usuarioId),
      listarServidoresParaEspelhoPonto({
        usuarioId: params.usuarioId,
        escopo: "chefia",
      }),
    ]);

    return (
      servidorProprio?.id === params.servidorId ||
      servidoresChefia.some((servidor) => servidor.id === params.servidorId)
    );
  }

  return false;
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

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!podeSolicitarRecalculo(permissoes)) {
    return {
      sucesso: false,
      mensagem: "Voce nao tem permissao para recalcular este mes.",
    };
  }

  const params = lerParametros(formData);
  if (!params.servidorId || !params.anoReferencia || !params.mesReferencia) {
    return { sucesso: false, mensagem: "Servidor ou competencia invalida." };
  }

  const permitido = await usuarioPodeRecalcularServidor({
    usuarioId: session.user.id,
    perfilAtivoCodigo: session.user.perfilAtivo?.codigo,
    servidorId: params.servidorId,
    permissoes,
  });

  if (!permitido) {
    return {
      sucesso: false,
      mensagem: "Voce nao tem permissao para recalcular este servidor.",
    };
  }

  if (!recalculoEspelhoPontoDisponivel()) {
    return {
      sucesso: false,
      mensagem: "O worker de recalculo do espelho esta inativo neste ambiente.",
    };
  }

  try {
    await enfileirarRecalculoEspelhoPonto({
      ...params,
      motivo: "RECALCULO_MANUAL_MES",
      solicitadoPorId: session.user.id,
      forcar: true,
    });
  } catch (error) {
    console.error(
      "[ESPELHO PONTO] Falha ao enfileirar recalculo manual",
      error,
    );
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
