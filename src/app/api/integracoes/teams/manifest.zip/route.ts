import { exigirPermissaoTeamsApi } from "@/modules/integracoes/teams/application/teams-api-auth.service";
import { obterOuCriarTeamsConfiguracao } from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { TEAMS_PERMISSOES } from "@/modules/integracoes/teams/domain/teams-permissoes";
import { gerarTeamsManifestZip } from "@/modules/integracoes/teams/infra/manifest/teams-manifest.zip.service";

export const runtime = "nodejs";

export async function GET() {
  const acesso = await exigirPermissaoTeamsApi(
    TEAMS_PERMISSOES.baixarManifesto,
  );

  if (!acesso.permitido) {
    return new Response("Acesso negado.", { status: acesso.status });
  }

  const configuracao = await obterOuCriarTeamsConfiguracao();
  const zip = await gerarTeamsManifestZip(configuracao);

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="secp-teams-manifest.zip"',
      "Cache-Control": "no-store",
    },
  });
}
