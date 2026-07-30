import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { listarMarcacoesBrutasParaExportacao } from "@/modules/marcacoes-brutas/infrastructure/repositories/marcacao-bruta.repository";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export const runtime = "nodejs";

function formatarDataHora(
  valor: Date | string | null | undefined,
  fusoHorario?: string | null,
) {
  if (!valor) return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("marcacoes:consultar:global") &&
    !permissoes.includes("marcacoes:consultar:seccional") &&
    !permissoes.includes("marcacoes:gerenciar:global") &&
    !permissoes.includes("marcacoes:gerenciar:seccional") &&
    !permissoes.includes("marcacoes:excluir:global") &&
    !permissoes.includes("marcacoes:excluir:seccional") &&
    !permissoes.includes("afd:importar:global") &&
    !permissoes.includes("afd:importar:seccional")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];
  const marcacoes = await listarMarcacoesBrutasParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    origem: url.searchParams.get("origem") ?? "",
    processada: url.searchParams.get("processada") ?? "",
    orgaoIdsPermitidos,
  });

  const linhas = [
    [
      "Data/hora",
      "Origem",
      "CPF",
      "Matricula",
      "Servidor vinculado",
      "Equipamento",
      "NSR",
      "Codigo externo",
      "Processada",
      "Marcacao",
    ],
    ...marcacoes.map((item) => [
      formatarDataHora(item.dataHora, item.marcacao?.fusoHorario),
      item.origem,
      item.cpf ?? "",
      item.matricula ?? "",
      nomeServidor(item.servidor),
      item.equipamentoCodigo ?? "",
      item.nsr ?? "",
      item.codigoExterno ?? "",
      item.processada ? "Sim" : "Nao",
      item.marcacao ? `${item.marcacao.tipo} / ${item.marcacao.status}` : "",
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
      "Content-Disposition": `attachment; filename="marcacoes-brutas.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
