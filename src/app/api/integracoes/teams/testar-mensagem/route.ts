import { NextResponse } from "next/server";

import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { enviarNotificacaoTeams } from "@/modules/integracoes/teams/application/teams-notification.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
