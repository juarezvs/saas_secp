import { auth } from "@/auth";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { listarUnidadesOrganizacionaisParaExportacao } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import {
  PdfListagemDocument,
  type PdfListagemDocumentProps,
} from "@/shared/reporting/pdf-builder";
import { type PdfTableColumn } from "@/shared/reporting/pdf-table";
import {
  criarElementoPdf,
  criarPdfResponse,
} from "@/shared/reporting/pdf-response";

export const runtime = "nodejs";

type UnidadeExportacao = Awaited<
  ReturnType<typeof listarUnidadesOrganizacionaisParaExportacao>
>[number];

const columns: PdfTableColumn<UnidadeExportacao>[] = [
  {
    key: "sigla",
    header: "Sigla",
    width: "9%",
    render: (unidade) => unidade.sigla,
  },
  {
    key: "nome",
    header: "Nome",
    width: "34%",
    render: (unidade) => unidade.nome,
  },
  {
    key: "tipo",
    header: "Tipo",
    width: "16%",
    render: (unidade) => unidade.tipo,
  },
  {
    key: "orgao",
    header: "Orgao",
    width: "8%",
    render: (unidade) => unidade.orgao.sigla,
  },
  {
    key: "superior",
    header: "Superior",
    width: "10%",
    render: (unidade) => unidade.unidadePai?.sigla,
  },
  {
    key: "subunidades",
    header: "Sub.",
    width: "6%",
    align: "center",
    render: (unidade) => unidade._count.unidadesFilhas,
  },
  {
    key: "lotacoes",
    header: "Lot.",
    width: "6%",
    align: "center",
    render: (unidade) => unidade._count.lotacoes,
  },
  {
    key: "status",
    header: "Status",
    width: "11%",
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

  const documento = criarElementoPdf(PdfListagemDocument<UnidadeExportacao>, {
    title: "SECP - Unidades Organizacionais",
    data: unidades,
    columns,
    getRowKey: (unidade) => unidade.id,
  } satisfies PdfListagemDocumentProps<UnidadeExportacao>);

  return criarPdfResponse({
    document: documento,
    filename: "unidades-organizacionais.pdf",
  });
}
