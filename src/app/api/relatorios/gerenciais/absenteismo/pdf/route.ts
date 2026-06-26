import { auth } from "@/auth";
import { gerarRelatorioGerencialPdfResponse } from "@/modules/relatorios/application/services/gerar-relatorio-gerencial-pdf-response.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", {
      status: 401,
    });
  }

  return gerarRelatorioGerencialPdfResponse({
    request,
    tipo: "ABSENTEISMO",
    usuarioId: session.user.id,
    permissoes: session.user.perfilAtivo?.permissoes ?? [],
  });
}
