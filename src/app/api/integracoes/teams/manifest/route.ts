import { NextResponse } from "next/server";

import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { obterOuCriarTeamsConfiguracao } from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";
import { gerarTeamsManifest } from "@/modules/integracoes/teams/infra/manifest/teams-manifest.builder";

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
  return NextResponse.json(gerarTeamsManifest(configuracao));
}
