import { auth } from "@/auth";
import { listarUsuariosParaExportacao } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "usuarios:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const usuarios = await listarUsuariosParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    matricula: url.searchParams.get("matricula") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    email: url.searchParams.get("email") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    lotacao: url.searchParams.get("lotacao") ?? "",
    perfil: url.searchParams.get("perfil") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const linhas = [
    [
      "Matricula/Login",
      "Nome",
      "E-mail",
      "CPF",
      "Tipo",
      "Lotacao",
      "Perfis",
      "Status",
    ],
    ...usuarios.map((usuario) => [
      usuario.matricula,
      usuario.nome,
      usuario.email ?? "",
      usuario.cpf ?? usuario.servidor?.cpf ?? "",
      usuario.tipo,
      usuario.servidor?.lotacoes[0]?.unidade.sigla ?? "",
      usuario.perfis.map((perfil) => perfil.perfil.codigo).join(", "),
      usuario.ativo ? "Ativo" : "Inativo",
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
      "Content-Disposition": `attachment; filename="usuarios.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
