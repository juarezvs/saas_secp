import { withHttpMetrics } from "@/lib/observability/http";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { obterPermissoesDaSessao } from "@/modules/auth/application/services/permissao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { listarServidoresParaExportacao } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
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

type ServidorExportacao = Awaited<
  ReturnType<typeof listarServidoresParaExportacao>
>[number];

const columns: PdfTableColumn<ServidorExportacao>[] = [
  {
    key: "matricula",
    header: "Matricula",
    width: "10%",
    render: (servidor) => servidor.matricula,
  },
  {
    key: "cpf",
    header: "CPF",
    width: "12%",
    render: (servidor) => servidor.cpf ?? servidor.usuario.cpf,
  },
  {
    key: "pis",
    header: "PIS/PASEP",
    width: "12%",
    render: (servidor) => servidor.pis,
  },
  {
    key: "nome",
    header: "Nome",
    width: "28%",
    render: (servidor) => nomeServidor(servidor),
  },
  {
    key: "orgao",
    header: "Orgao",
    width: "8%",
    render: (servidor) => servidor.orgao.sigla,
  },
  {
    key: "vinculo",
    header: "Vinculo",
    width: "14%",
    render: (servidor) => servidor.vinculo,
  },
  {
    key: "lotacao",
    header: "Lotacao",
    width: "10%",
    render: (servidor) => servidor.lotacoes[0]?.unidade.sigla,
  },
  {
    key: "status",
    header: "Status",
    width: "10%",
    render: (servidor) => (servidor.ativo ? "Ativo" : "Inativo"),
  },
];

async function getServidoresExportPdf(request: Request) {
  const permissao = await obterPermissoesDaSessao();
  const permissoesExportacao = [
    "servidores:gerenciar:global",
    "servidores:consultar:global",
    "servidores:gerenciar:seccional",
    "servidores:consultar:seccional",
  ];

  if (
    !permissao.permitido ||
    !permissoesExportacao.some((codigo) =>
      permissao.permissoes.includes(codigo),
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const servidores = await listarServidoresParaExportacao(
    aplicarEscopoOrgaoId(
      {
        busca: url.searchParams.get("busca") ?? "",
        matricula: url.searchParams.get("matricula") ?? "",
        cpf: url.searchParams.get("cpf") ?? "",
        pis: url.searchParams.get("pis") ?? "",
        nome: url.searchParams.get("nome") ?? "",
        tipoUsuario: url.searchParams.get("tipoUsuario") ?? "",
        orgaoId: url.searchParams.get("orgaoId") ?? "",
        vinculo: url.searchParams.get("vinculo") ?? "",
        lotacao: url.searchParams.get("lotacao") ?? "",
        status: url.searchParams.get("status") ?? "",
      },
      escopoOrgao,
    ),
  );

  const documento = criarElementoPdf(PdfListagemDocument<ServidorExportacao>, {
    title: "Servidores",
    data: servidores,
    columns,
    getRowKey: (servidor) => servidor.id,
  } satisfies PdfListagemDocumentProps<ServidorExportacao>);

  return criarPdfResponse({
    document: documento,
    filename: "servidores.pdf",
  });
}

export const GET = withHttpMetrics(
  "/api/servidores/export/pdf",
  getServidoresExportPdf,
);
