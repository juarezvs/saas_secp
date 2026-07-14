import { NextResponse } from "next/server";

import { withHttpMetrics } from "@/lib/observability/http";
import { listarTeamsLogsRecentes } from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";

export const runtime = "nodejs";

async function getTeamsLogs(request: Request) {
  const acesso = await exigirPermissaoTeamsApi(TEAMS_PERMISSOES.visualizar);

  if (!acesso.permitido) {
    return NextResponse.json(
      { erro: "Acesso negado." },
      { status: acesso.status },
    );
  }

  const limite = Number(new URL(request.url).searchParams.get("limite") ?? 20);
  const logs = await listarTeamsLogsRecentes(
    Number.isFinite(limite) ? limite : 20,
  );

  return NextResponse.json({ logs });
}

export const GET = withHttpMetrics("/api/integracoes/teams/logs", getTeamsLogs);
