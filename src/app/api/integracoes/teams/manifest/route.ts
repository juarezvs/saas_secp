import { NextResponse } from "next/server";

import { withHttpMetrics } from "@/lib/observability/http";
import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { obterOuCriarTeamsConfiguracao } from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";
import { gerarTeamsManifest } from "@/modules/integracoes/teams/infra/manifest/teams-manifest.builder";

export const runtime = "nodejs";

async function getTeamsManifest(request: Request) {
  void request;
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

export const GET = withHttpMetrics(
  "/api/integracoes/teams/manifest",
  getTeamsManifest,
);
