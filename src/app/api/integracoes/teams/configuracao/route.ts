import { NextResponse } from "next/server";

import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";
import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import {
  atualizarTeamsConfiguracao,
  obterOuCriarTeamsConfiguracao,
  serializarTeamsConfiguracao,
} from "@/modules/integracoes/teams/application/teams-configuracao.service";

export const runtime = "nodejs";

export async function GET() {
  const acesso = await exigirPermissaoTeamsApi(TEAMS_PERMISSOES.visualizar);

  if (!acesso.permitido) {
    return NextResponse.json(
      { erro: "Acesso negado." },
      { status: acesso.status },
    );
  }

  const configuracao = await obterOuCriarTeamsConfiguracao();
  return NextResponse.json(serializarTeamsConfiguracao(configuracao));
}

export async function PUT(request: Request) {
  const acesso = await exigirPermissaoTeamsApi(TEAMS_PERMISSOES.configurar);

  if (!acesso.permitido) {
    return NextResponse.json(
      { erro: "Acesso negado." },
      { status: acesso.status },
    );
  }

  const body = await request.json();
  const configuracao = await atualizarTeamsConfiguracao(
    {
      ativo: Boolean(body.ativo),
      ambiente: body.ambiente ?? "desenvolvimento",
      microsoftAppId: body.microsoftAppId ?? null,
      microsoftAppSecret: body.microsoftAppSecret ?? null,
      tenantId: body.tenantId ?? null,
      botEndpoint: body.botEndpoint ?? null,
      messagingEndpoint: body.messagingEndpoint ?? null,
      urlPublicaSecp: body.urlPublicaSecp ?? null,
      politicaEnvioNotificacoes:
        body.politicaEnvioNotificacoes ?? "somente_vinculados",
      botConversacionalAtivo: Boolean(body.botConversacionalAtivo),
      notificacoesAtivas: Boolean(body.notificacoesAtivas),
      adaptiveCardsAtivos: Boolean(body.adaptiveCardsAtivos),
      abasTeamsAtivas: Boolean(body.abasTeamsAtivas),
      registroPontoAtivo: Boolean(body.registroPontoAtivo),
      consultaBancoHorasAtiva: Boolean(body.consultaBancoHorasAtiva),
      aprovacoesAtivas: Boolean(body.aprovacoesAtivas),
      homologacoesAtivas: Boolean(body.homologacoesAtivas),
    },
    acesso.usuarioId,
  );

  return NextResponse.json(serializarTeamsConfiguracao(configuracao));
}
