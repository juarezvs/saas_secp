import { auth } from "@/auth";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { listarOrgaosParaExportacao } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";

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

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "unidades:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = await listarOrgaosParaExportacao(
    aplicarEscopoOrgaoId(
      {
        busca: url.searchParams.get("busca") ?? "",
        sigla: url.searchParams.get("sigla") ?? "",
        nome: url.searchParams.get("nome") ?? "",
        codigoExternoSarh: url.searchParams.get("codigoExternoSarh") ?? "",
        status: url.searchParams.get("status") ?? "",
        fusoHorario: url.searchParams.get("fusoHorario") ?? "",
      },
      escopoOrgao,
    ),
  );

  const linhas = [
    [
      "Sigla",
      "Nome",
      "Codigo SARH",
      "Cidade",
      "UF",
      "Codigo IBGE",
      "Unidades",
      "Servidores",
      "Fuso",
      "Ultima sincronizacao SARH",
      "Status",
    ],
    ...orgaos.map((orgao) => [
      orgao.sigla,
      orgao.nome,
      orgao.codigoExternoSarh ?? "",
      orgao.municipio ?? "",
      orgao.uf ?? "",
      orgao.municipioIbge ?? "",
      orgao._count.unidades,
      orgao._count.servidores,
      orgao.fusoHorario ?? "",
      formatarData(orgao.ultimaSincronizacaoSarh),
      orgao.ativo ? "Ativo" : "Inativo",
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
      "Content-Disposition": `attachment; filename="orgaos.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
