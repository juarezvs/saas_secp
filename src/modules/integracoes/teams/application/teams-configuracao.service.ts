import { prisma } from "@/shared/infrastructure/database/prisma";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";

import type { TeamsConfiguracaoInput } from "../domain/teams-config.types";
import { criptografarTeamsSecret } from "../infra/security/teams-secret-crypto.service";

const SELECT_CONFIGURACAO = {
  id: true,
  ativo: true,
  ambiente: true,
  microsoftAppId: true,
  microsoftAppSecretCriptografado: true,
  tenantId: true,
  botEndpoint: true,
  messagingEndpoint: true,
  urlPublicaSecp: true,
  politicaEnvioNotificacoes: true,
  botConversacionalAtivo: true,
  notificacoesAtivas: true,
  adaptiveCardsAtivos: true,
  abasTeamsAtivas: true,
  registroPontoAtivo: true,
  consultaBancoHorasAtiva: true,
  aprovacoesAtivas: true,
  homologacoesAtivas: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

function limparTexto(valor: string | null | undefined) {
  const texto = valor?.trim();
  return texto ? texto : null;
}

export async function obterOuCriarTeamsConfiguracao() {
  const existente = await prisma.integracaoTeamsConfiguracao.findFirst({
    select: SELECT_CONFIGURACAO,
    orderBy: { criadoEm: "asc" },
  });

  if (existente) {
    return existente;
  }

  return prisma.integracaoTeamsConfiguracao.create({
    data: {},
    select: SELECT_CONFIGURACAO,
  });
}

export async function listarTeamsLogsRecentes(limite = 20) {
  return prisma.teamsLog.findMany({
    orderBy: { criadoEm: "desc" },
    take: limite,
  });
}

export async function registrarTeamsLog(params: {
  tipo: string;
  direcao: string;
  usuarioId?: string | null;
  teamsUserId?: string | null;
  evento: string;
  payloadResumo?: string | null;
  sucesso?: boolean;
  erro?: string | null;
}) {
  return prisma.teamsLog.create({
    data: {
      tipo: params.tipo,
      direcao: params.direcao,
      usuarioId: params.usuarioId ?? null,
      teamsUserId: params.teamsUserId ?? null,
      evento: params.evento,
      payloadResumo: params.payloadResumo?.slice(0, 2000) ?? null,
      sucesso: params.sucesso ?? true,
      erro: params.erro?.slice(0, 2000) ?? null,
    },
  });
}

export async function atualizarTeamsConfiguracao(
  input: TeamsConfiguracaoInput,
  usuarioId?: string | null,
) {
  const atual = await obterOuCriarTeamsConfiguracao();
  const secretInformado = input.microsoftAppSecret?.trim();
  const secretCriptografado = secretInformado
    ? criptografarTeamsSecret(secretInformado)
    : atual.microsoftAppSecretCriptografado;

  const atualizado = await prisma.integracaoTeamsConfiguracao.update({
    where: { id: atual.id },
    data: {
      ativo: input.ativo,
      ambiente: input.ambiente,
      microsoftAppId: limparTexto(input.microsoftAppId),
      microsoftAppSecretCriptografado: secretCriptografado,
      tenantId: limparTexto(input.tenantId),
      botEndpoint: limparTexto(input.botEndpoint),
      messagingEndpoint: limparTexto(input.messagingEndpoint),
      urlPublicaSecp: limparTexto(input.urlPublicaSecp),
      politicaEnvioNotificacoes: input.politicaEnvioNotificacoes,
      botConversacionalAtivo: input.botConversacionalAtivo,
      notificacoesAtivas: input.notificacoesAtivas,
      adaptiveCardsAtivos: input.adaptiveCardsAtivos,
      abasTeamsAtivas: input.abasTeamsAtivas,
      registroPontoAtivo: input.registroPontoAtivo,
      consultaBancoHorasAtiva: input.consultaBancoHorasAtiva,
      aprovacoesAtivas: input.aprovacoesAtivas,
      homologacoesAtivas: input.homologacoesAtivas,
    },
    select: SELECT_CONFIGURACAO,
  });

  await registrarAuditoriaEvento({
    usuarioId,
    entidade: "IntegracaoTeamsConfiguracao",
    entidadeId: atualizado.id,
    acao: "INTEGRACAO_TEAMS_CONFIGURADA",
    dadosAntes: {
      id: atual.id,
      ativo: atual.ativo,
      ambiente: atual.ambiente,
      microsoftAppId: atual.microsoftAppId,
      tenantId: atual.tenantId,
    },
    dadosDepois: {
      ...atualizado,
      microsoftAppSecretCriptografado: secretCriptografado
        ? "[REDACTED]"
        : null,
    },
  });

  await registrarTeamsLog({
    tipo: "CONFIGURACAO",
    direcao: "INTERNO",
    usuarioId,
    evento: "CONFIGURACAO_ATUALIZADA",
    sucesso: true,
  });

  return atualizado;
}

export function serializarTeamsConfiguracao(
  configuracao: Awaited<ReturnType<typeof obterOuCriarTeamsConfiguracao>>,
) {
  return {
    ...configuracao,
    possuiMicrosoftAppSecret: Boolean(
      configuracao.microsoftAppSecretCriptografado,
    ),
    microsoftAppSecretCriptografado: undefined,
  };
}
