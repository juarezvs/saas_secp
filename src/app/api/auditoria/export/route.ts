import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { listarEventosAuditoriaParaExportacao } from "@/modules/auditoria/infrastructure/repositories/auditoria.repository";
import { formatarDataHoraAuditoria } from "@/modules/auditoria/application/services/formatar-auditoria.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("auditoria:consultar:global") &&
    !permissoes.includes("auditoria:detalhar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const eventos = await listarEventosAuditoriaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    entidade: url.searchParams.get("entidade") ?? "",
    acao: url.searchParams.get("acao") ?? "",
    usuarioId: url.searchParams.get("usuarioId") ?? "",
    dataInicio: url.searchParams.get("dataInicio") ?? "",
    dataFim: url.searchParams.get("dataFim") ?? "",
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
  });

  const linhas = [
    ["Data/hora", "Usuario", "Matricula", "Entidade", "ID entidade", "Acao", "IP"],
    ...eventos.map((evento) => [
      formatarDataHoraAuditoria(evento.criadoEm),
      evento.usuario?.nome ?? "Sistema/sem usuario",
      evento.usuario?.matricula ?? "",
      evento.entidade,
      evento.entidadeId ?? "",
      evento.acao,
      evento.ip ?? "",
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
      "Content-Disposition": `attachment; filename="auditoria.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
