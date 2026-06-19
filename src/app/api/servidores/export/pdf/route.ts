import { auth } from "@/auth";
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
    width: "11%",
    render: (servidor) => servidor.matricula,
  },
  {
    key: "cpf",
    header: "CPF",
    width: "13%",
    render: (servidor) => servidor.cpf ?? servidor.usuario.cpf,
  },
  {
    key: "nome",
    header: "Nome",
    width: "34%",
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

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "servidores:consultar:global",
    ) &&
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "servidores:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const servidores = await listarServidoresParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    matricula: url.searchParams.get("matricula") ?? "",
    cpf: url.searchParams.get("cpf") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    orgaoId: url.searchParams.get("orgaoId") ?? "",
    vinculo: url.searchParams.get("vinculo") ?? "",
    lotacao: url.searchParams.get("lotacao") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

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
