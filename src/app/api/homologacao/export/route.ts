import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { listarFechamentosMensaisParaExportacao } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { rotuloStatusFechamento } from "@/modules/homologacao/application/services/formatar-homologacao.service";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";

export const runtime = "nodejs";

function nomesHomologadoresServidores(
  servidores: {
    homologadoPor: {
      nome: string;
    } | null;
  }[],
) {
  return Array.from(
    new Set(
      servidores
        .map((servidor) => servidor.homologadoPor?.nome)
        .filter((nome): nome is string => Boolean(nome)),
    ),
  ).join(", ");
}

async function getHomologacaoExport(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("homologacao:gerenciar:chefia") &&
    !permissoes.includes("homologacao:consultar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  if (new URL(request.url).searchParams.get("sync") !== "1") {
    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "HOMOLOGACAO",
      formato: "CSV",
      usuarioId: session!.user.id,
      permissoes,
    });
  }

  const url = new URL(request.url);
  const fechamentos = await listarFechamentosMensaisParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const linhas = [
    [
      "Referencia",
      "Unidade",
      "Servidores",
      "Status",
      "Aberto por",
      "Homologado por",
    ],
    ...fechamentos.map((fechamento) => [
      `${String(fechamento.mesReferencia).padStart(2, "0")}/${fechamento.anoReferencia}`,
      `${fechamento.unidade.sigla} - ${fechamento.unidade.nome}`,
      fechamento.servidores.length,
      rotuloStatusFechamento(fechamento.status),
      fechamento.abertoPor.nome,
      fechamento.homologadoPor?.nome ||
        nomesHomologadoresServidores(fechamento.servidores),
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
      "Content-Disposition": `attachment; filename="homologacao.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics(
  "/api/homologacao/export",
  getHomologacaoExport,
);
