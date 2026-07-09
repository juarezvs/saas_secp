import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  obterOuCriarTeamsConfiguracao,
  registrarTeamsLog,
} from "./teams-configuracao.service";

export async function enviarNotificacaoTeams(
  usuarioId: string,
  evento: string,
  payload: {
    titulo?: string;
    mensagem?: string;
    tipo?: string;
    [key: string]: unknown;
  },
) {
  try {
    const configuracao = await obterOuCriarTeamsConfiguracao();

    if (!configuracao.ativo || !configuracao.notificacoesAtivas) {
      await registrarTeamsLog({
        tipo: "NOTIFICACAO",
        direcao: "SAIDA",
        usuarioId,
        evento,
        payloadResumo: "Notificação ignorada: integração Teams inativa.",
        sucesso: true,
      });
      return { enviada: false, motivo: "teams_inativo" };
    }

    const vinculo = await prisma.teamsUsuarioVinculado.findFirst({
      where: { usuarioId, ativo: true },
      orderBy: { atualizadoEm: "desc" },
    });

    if (!vinculo) {
      await prisma.teamsNotificacao.create({
        data: {
          usuarioId,
          titulo: payload.titulo ?? "SECP",
          mensagem: payload.mensagem ?? "Há uma nova atualização no SECP.",
          tipo: payload.tipo ?? evento,
          status: "sem_vinculo",
        },
      });
      return { enviada: false, motivo: "usuario_nao_vinculado" };
    }

    const notificacao = await prisma.teamsNotificacao.create({
      data: {
        usuarioId,
        teamsUserId: vinculo.teamsUserId,
        titulo: payload.titulo ?? "SECP",
        mensagem: payload.mensagem ?? "Há uma nova atualização no SECP.",
        tipo: payload.tipo ?? evento,
        status: "pendente",
      },
    });

    if (!configuracao.messagingEndpoint) {
      await prisma.teamsNotificacao.update({
        where: { id: notificacao.id },
        data: {
          status: "erro",
          erro: "Messaging endpoint não configurado.",
        },
      });
      await registrarTeamsLog({
        tipo: "NOTIFICACAO",
        direcao: "SAIDA",
        usuarioId,
        teamsUserId: vinculo.teamsUserId,
        evento,
        sucesso: false,
        erro: "Messaging endpoint não configurado.",
      });
      return { enviada: false, motivo: "endpoint_nao_configurado" };
    }

    const response = await fetch(configuracao.messagingEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamsUserId: vinculo.teamsUserId,
        conversationId: vinculo.teamsConversationId,
        serviceUrl: vinculo.serviceUrl,
        titulo: payload.titulo ?? "SECP",
        mensagem: payload.mensagem ?? "Há uma nova atualização no SECP.",
        evento,
      }),
    });

    if (!response.ok) {
      throw new Error(`Endpoint retornou HTTP ${response.status}.`);
    }

    await prisma.teamsNotificacao.update({
      where: { id: notificacao.id },
      data: { status: "enviada", enviadoEm: new Date(), erro: null },
    });
    await registrarTeamsLog({
      tipo: "NOTIFICACAO",
      direcao: "SAIDA",
      usuarioId,
      teamsUserId: vinculo.teamsUserId,
      evento,
      sucesso: true,
    });

    return { enviada: true };
  } catch (error) {
    await registrarTeamsLog({
      tipo: "NOTIFICACAO",
      direcao: "SAIDA",
      usuarioId,
      evento,
      sucesso: false,
      erro: error instanceof Error ? error.message : "Falha inesperada.",
    });
    return { enviada: false, motivo: "erro_envio" };
  }
}
