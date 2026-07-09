import { NextResponse } from "next/server";

import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import {
  obterOuCriarTeamsConfiguracao,
  registrarTeamsLog,
} from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";

export const runtime = "nodejs";

export async function POST() {
  const acesso = await exigirPermissaoTeamsApi(TEAMS_PERMISSOES.testar);

  if (!acesso.permitido) {
    return NextResponse.json(
      { erro: "Acesso negado." },
      { status: acesso.status },
    );
  }

  const config = await obterOuCriarTeamsConfiguracao();
  const pendencias = [
    !config.microsoftAppId ? "Microsoft App ID" : null,
    !config.tenantId ? "Tenant ID" : null,
    !config.botEndpoint ? "Bot endpoint" : null,
    !config.urlPublicaSecp ? "URL pública do SECP" : null,
  ].filter(Boolean);

  await registrarTeamsLog({
    tipo: "TESTE",
    direcao: "INTERNO",
    usuarioId: acesso.usuarioId,
    evento: "TESTE_CONEXAO",
    sucesso: pendencias.length === 0,
    erro: pendencias.length ? `Pendências: ${pendencias.join(", ")}` : null,
  });

  if (pendencias.length) {
    return NextResponse.json(
      { ok: false, mensagem: `Pendências: ${pendencias.join(", ")}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    mensagem: "Configuração mínima do Teams validada.",
  });
}
