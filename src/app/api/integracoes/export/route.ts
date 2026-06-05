import { auth } from "@/auth";
import { listarIntegracoesSistemaParaExportacao } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";

export const runtime = "nodejs";

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("integracoes:gerenciar:global") &&
    !permissoes.includes("integracoes:consultar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const integracoes = await listarIntegracoesSistemaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    status: url.searchParams.get("status") ?? "",
    direcao: url.searchParams.get("direcao") ?? "",
    ativo: url.searchParams.get("ativo") ?? "",
  });

  const linhas = [
    [
      "Nome",
      "Tipo",
      "Status",
      "Direcao",
      "Ativa",
      "Logs",
      "Equipamentos",
      "Ultimo sucesso",
      "Ultimo erro",
    ],
    ...integracoes.map((integracao) => [
      integracao.nome,
      integracao.tipo,
      integracao.status,
      integracao.direcao,
      integracao.ativo ? "Sim" : "Nao",
      integracao._count.logs,
      integracao._count.equipamentos,
      formatarData(integracao.ultimoSucessoEm),
      integracao.ultimoErro ?? "",
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
      "Content-Disposition": `attachment; filename="integracoes.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
