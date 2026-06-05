import { auth } from "@/auth";
import { listarPerfisParaExportacao } from "@/modules/perfis/infrastructure/repositories/perfil.repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "perfis:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const perfis = await listarPerfisParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    codigo: url.searchParams.get("codigo") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    permissao: url.searchParams.get("permissao") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const linhas = [
    ["Codigo", "Nome", "Descricao", "Usuarios", "Permissoes", "Status"],
    ...perfis.map((perfil) => [
      perfil.codigo,
      perfil.nome,
      perfil.descricao ?? "",
      perfil._count.usuarios,
      perfil.permissoes.length,
      perfil.ativo ? "Ativo" : "Inativo",
    ]),
  ];

  const csv = linhas
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="perfis.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
