import { auth } from "@/auth";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { listarUnidadesOrganizacionaisParaExportacao } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { type CsvColumn } from "@/shared/export/csv-builder";
import { criarCsvResponse } from "@/shared/export/csv-response";

export const runtime = "nodejs";

type UnidadeExportacao = Awaited<
  ReturnType<typeof listarUnidadesOrganizacionaisParaExportacao>
>[number];

const columns: CsvColumn<UnidadeExportacao>[] = [
  { header: "Sigla", render: (unidade) => unidade.sigla },
  { header: "Codigo", render: (unidade) => unidade.codigo },
  { header: "Nome", render: (unidade) => unidade.nome },
  { header: "Tipo", render: (unidade) => unidade.tipo },
  { header: "Orgao", render: (unidade) => unidade.orgao.sigla },
  {
    header: "Superior",
    render: (unidade) => unidade.unidadePai?.sigla ?? "",
  },
  {
    header: "Subunidades",
    render: (unidade) => unidade._count.unidadesFilhas,
  },
  { header: "Lotados", render: (unidade) => unidade._count.lotacoes },
  {
    header: "Status",
    render: (unidade) => (unidade.ativo ? "Ativa" : "Inativa"),
  },
];

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
  const unidades = await listarUnidadesOrganizacionaisParaExportacao(
    aplicarEscopoOrgaoId(
      {
        busca: url.searchParams.get("busca") ?? "",
        sigla: url.searchParams.get("sigla") ?? "",
        nome: url.searchParams.get("nome") ?? "",
        tipo: url.searchParams.get("tipo") ?? "",
        orgaoId: url.searchParams.get("orgaoId") ?? "",
        superior: url.searchParams.get("superior") ?? "",
        status: url.searchParams.get("status") ?? "",
      },
      escopoOrgao,
    ),
  );

  return criarCsvResponse({
    filename: "unidades-organizacionais.csv",
    columns,
    data: unidades,
  });
}
