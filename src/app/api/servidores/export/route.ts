import { auth } from "@/auth";
import { listarServidoresParaExportacao } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.perfilAtivo?.permissoes?.includes(
    "servidores:consultar:global",
  )) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const servidores = await listarServidoresParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    status: url.searchParams.get("status") ?? "",
    orgaoId: url.searchParams.get("orgaoId") ?? "",
    vinculo: url.searchParams.get("vinculo") ?? "",
  });

  const linhas = [
    [
      "Matrícula",
      "CPF",
      "Nome",
      "E-mail",
      "Órgão",
      "Vínculo",
      "Lotação atual",
      "Status",
    ],
    ...servidores.map((servidor) => [
      servidor.matricula,
      servidor.cpf ?? "",
      servidor.usuario.nome,
      servidor.usuario.email ?? "",
      servidor.orgao.sigla,
      servidor.vinculo,
      servidor.lotacoes[0]?.unidade.sigla ?? "",
      servidor.ativo ? "Ativo" : "Inativo",
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
      "Content-Disposition": `attachment; filename="servidores.csv"`,
      "Cache-Control": "no-store",
    },
  });
}