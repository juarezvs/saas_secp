import { NextResponse } from "next/server";

import { withHttpMetrics } from "@/lib/observability/http";
import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { enviarNotificacaoTeams } from "@/modules/integracoes/teams/application/teams-notification.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";

export const runtime = "nodejs";

async function postTeamsTestarMensagem(request: Request) {
  const acesso = await exigirPermissaoTeamsApi(TEAMS_PERMISSOES.testar);

  if (!acesso.permitido) {
    return NextResponse.json(
      { erro: "Acesso negado." },
      { status: acesso.status },
    );
  }

  const body = await request.json().catch(() => ({}));
  const usuarioId = String(body.usuarioId ?? acesso.usuarioId ?? "");

  if (!usuarioId) {
    return NextResponse.json(
      { erro: "Informe um usuário para testar a mensagem." },
      { status: 400 },
    );
  }

  const resultado = await enviarNotificacaoTeams(usuarioId, "TESTE_ADMIN", {
    titulo: "Teste SECP",
    mensagem: "Mensagem de teste da integração Microsoft Teams do SECP.",
    tipo: "teste",
  });

  return NextResponse.json(resultado);
}

export const POST = withHttpMetrics(
  "/api/integracoes/teams/testar-mensagem",
  postTeamsTestarMensagem,
);
