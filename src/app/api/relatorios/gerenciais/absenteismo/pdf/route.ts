import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { gerarRelatorioGerencialPdfResponse } from "@/modules/relatorios/application/services/gerar-relatorio-gerencial-pdf-response.service";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";

export const runtime = "nodejs";

async function getRelatorioGerencialAbsenteismoPdf(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", {
      status: 401,
    });
  }

  if (new URL(request.url).searchParams.get("sync") !== "1") {
    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "GERENCIAL",
      formato: "PDF",
      relatorioGerencialTipo: "ABSENTEISMO",
      usuarioId: session.user.id,
      permissoes: session.user.perfilAtivo?.permissoes ?? [],
    });
  }

  return gerarRelatorioGerencialPdfResponse({
    request,
    tipo: "ABSENTEISMO",
    usuarioId: session.user.id,
    permissoes: session.user.perfilAtivo?.permissoes ?? [],
  });
}

export const GET = withHttpMetrics(
  "/api/relatorios/gerenciais/absenteismo/pdf",
  getRelatorioGerencialAbsenteismoPdf,
);
