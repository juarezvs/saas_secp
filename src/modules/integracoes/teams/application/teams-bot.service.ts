import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";

import { TEAMS_PERMISSOES } from "../domain/teams-permissoes";
import {
  criarTeamsCardMenuPrincipal,
  criarTeamsCardResumo,
} from "./teams-adaptive-card.service";
import {
  obterOuCriarTeamsConfiguracao,
  registrarTeamsLog,
} from "./teams-configuracao.service";
import { buscarVinculoTeams } from "./teams-user-link.service";

type TeamsActivity = {
  type?: string;
  text?: string;
  value?: { comando?: string };
  from?: {
    id?: string;
    aadObjectId?: string;
    userPrincipalName?: string;
    name?: string;
  };
  conversation?: { id?: string; tenantId?: string };
  channelData?: {
    tenant?: { id?: string };
  };
  serviceUrl?: string;
};

function normalizarComando(activity: TeamsActivity) {
  return (activity.value?.comando || activity.text || "menu")
    .trim()
    .toLowerCase();
}

function respostaTexto(text: string) {
  return { type: "message", text };
}

function respostaCard(card: unknown) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };
}

async function usuarioVinculadoPossuiPermissao(
  matricula: string,
  permissao: string,
) {
  const usuario = await buscarUsuarioParaLoginPorMatricula(matricula);
  return usuario?.perfis.some((perfil) =>
    perfil.permissoes.includes(permissao),
  );
}

export async function processarMensagemTeams(activity: TeamsActivity) {
  const config = await obterOuCriarTeamsConfiguracao();
  const tenantId =
    activity.channelData?.tenant?.id || activity.conversation?.tenantId || null;
  const teamsUserId = activity.from?.id ?? null;

  if (!config.ativo || !config.botConversacionalAtivo) {
    await registrarTeamsLog({
      tipo: "BOT",
      direcao: "ENTRADA",
      teamsUserId,
      evento: "BOT_INATIVO",
      sucesso: false,
      erro: "Integração Teams ou bot conversacional inativo.",
    });
    return respostaTexto("O bot do SECP no Teams está desativado.");
  }

  const comando = normalizarComando(activity);
  const vinculo = await buscarVinculoTeams({
    teamsUserId,
    teamsAadObjectId: activity.from?.aadObjectId,
    tenantId,
  });

  await registrarTeamsLog({
    tipo: "BOT",
    direcao: "ENTRADA",
    usuarioId: vinculo?.usuarioId,
    teamsUserId,
    evento: `COMANDO_${comando.toUpperCase().replace(/\s+/g, "_")}`,
    payloadResumo: JSON.stringify({
      comando,
      tenantId,
      conversationId: activity.conversation?.id,
    }),
    sucesso: true,
  });

  if (["menu", "ajuda", "olá", "ola", "iniciar"].includes(comando)) {
    return respostaCard(criarTeamsCardMenuPrincipal());
  }

  if (!vinculo) {
    return respostaTexto(
      "Não consegui vincular seu usuário do Teams ao SECP. Acesse o SECP pelo navegador ou peça ao administrador para revisar a integração.",
    );
  }

  if (
    !(await usuarioVinculadoPossuiPermissao(
      vinculo.usuario.matricula,
      TEAMS_PERMISSOES.botUsar,
    ))
  ) {
    return respostaTexto(
      "Seu perfil não possui permissão para usar o bot do SECP.",
    );
  }

  if (
    ["meu ponto", "marcações de hoje", "marcacoes de hoje"].includes(comando)
  ) {
    return respostaCard(
      criarTeamsCardResumo(
        "Meu ponto",
        "Consulta detalhada de marcações pelo Teams está preparada para integração com o espelho do SECP.",
      ),
    );
  }

  if (["banco de horas", "saldo"].includes(comando)) {
    if (!config.consultaBancoHorasAtiva) {
      return respostaTexto(
        "Consulta de banco de horas pelo Teams está desativada.",
      );
    }

    return respostaCard(
      criarTeamsCardResumo(
        "Banco de horas",
        "Consulta consolidada será exibida aqui quando o serviço de banco de horas estiver conectado ao bot.",
      ),
    );
  }

  if (comando === "registrar ponto") {
    if (!config.registroPontoAtivo) {
      return respostaTexto(
        "Registro de ponto pelo Teams está indisponível no momento.",
      );
    }

    const permitido = await usuarioVinculadoPossuiPermissao(
      vinculo.usuario.matricula,
      TEAMS_PERMISSOES.pontoRegistrar,
    );

    if (!permitido) {
      return respostaTexto(
        "Seu perfil não está autorizado a registrar ponto pelo Teams.",
      );
    }

    await registrarTeamsLog({
      tipo: "BOT",
      direcao: "INTERNO",
      usuarioId: vinculo.usuarioId,
      teamsUserId,
      evento: "REGISTRO_PONTO_TEAMS_BLOQUEADO_REGRAS",
      sucesso: false,
      erro: "Workflow real de marcação via Teams ainda não habilitado.",
    });

    return respostaTexto(
      "Registro de ponto pelo Teams ainda depende da liberação das regras operacionais do SECP para esta origem.",
    );
  }

  if (
    ["espelho", "minhas solicitações", "nova solicitação"].includes(comando)
  ) {
    return respostaTexto(
      "Abra a aba do SECP no Teams para acessar esta rotina.",
    );
  }

  if (["aprovações pendentes", "aprovacoes pendentes"].includes(comando)) {
    return respostaTexto(
      "As aprovações pelo Teams serão exibidas por Adaptive Cards.",
    );
  }

  if (["homologações pendentes", "homologacoes pendentes"].includes(comando)) {
    return respostaTexto(
      "As homologações pelo Teams serão exibidas por Adaptive Cards.",
    );
  }

  return respostaTexto(
    "Comando não reconhecido. Digite menu para ver as opções.",
  );
}
