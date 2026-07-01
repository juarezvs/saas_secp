import { auth } from "@/auth";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { listarServidoresParaExportacao } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { type CsvColumn } from "@/shared/export/csv-builder";
import { criarCsvResponse } from "@/shared/export/csv-response";

export const runtime = "nodejs";

type ServidorExportacao = Awaited<
  ReturnType<typeof listarServidoresParaExportacao>
>[number];

const columns: CsvColumn<ServidorExportacao>[] = [
  { header: "Matricula", render: (servidor) => servidor.matricula },
  { header: "CPF", render: (servidor) => servidor.cpf ?? "" },
  { header: "Nome", render: (servidor) => nomeServidor(servidor) },
  { header: "E-mail", render: (servidor) => servidor.usuario.email ?? "" },
  { header: "Orgao", render: (servidor) => servidor.orgao.sigla },
  { header: "Vinculo", render: (servidor) => servidor.vinculo },
  {
    header: "Lotacao atual",
    render: (servidor) => servidor.lotacoes[0]?.unidade.sigla ?? "",
  },
  {
    header: "Status",
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

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const servidores = await listarServidoresParaExportacao(
    aplicarEscopoOrgaoId(
      {
        busca: url.searchParams.get("busca") ?? "",
        matricula: url.searchParams.get("matricula") ?? "",
        cpf: url.searchParams.get("cpf") ?? "",
        nome: url.searchParams.get("nome") ?? "",
        orgaoId: url.searchParams.get("orgaoId") ?? "",
        vinculo: url.searchParams.get("vinculo") ?? "",
        lotacao: url.searchParams.get("lotacao") ?? "",
        status: url.searchParams.get("status") ?? "",
      },
      escopoOrgao,
    ),
  );

  return criarCsvResponse({
    filename: "servidores.csv",
    columns,
    data: servidores,
  });
}
