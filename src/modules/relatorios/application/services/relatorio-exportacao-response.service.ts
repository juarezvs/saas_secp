import { enfileirarRelatorioExportacao } from "../queues/relatorio-exportacao-queue";
import type {
  RelatorioExportacaoFormato,
  RelatorioExportacaoTipo,
} from "../queues/relatorio-exportacao-queue";
import type { TipoRelatorioGerencial } from "../../infrastructure/repositories/relatorios-gerenciais.repository";

function filtrosDaUrl(request: Request) {
  const url = new URL(request.url);
  return Object.fromEntries(
    Array.from(url.searchParams.entries()).filter(
      ([chave]) => !["sync", "download"].includes(chave),
    ),
  );
}

export async function enfileirarRelatorioExportacaoResponse(params: {
  request: Request;
  tipo: RelatorioExportacaoTipo;
  formato: RelatorioExportacaoFormato;
  usuarioId: string;
  permissoes: string[];
  relatorioGerencialTipo?: TipoRelatorioGerencial;
  filtros?: Record<string, string | null>;
}) {
  const job = await enfileirarRelatorioExportacao({
    tipo: params.tipo,
    formato: params.formato,
    usuarioId: params.usuarioId,
    permissoes: params.permissoes,
    relatorioGerencialTipo: params.relatorioGerencialTipo,
    filtros: {
      ...filtrosDaUrl(params.request),
      ...(params.filtros ?? {}),
      requestUrl: params.request.url,
    },
  });

  return Response.json(
    {
      jobId: job.id,
      statusUrl: `/api/relatorios/exportacoes/${job.id}`,
      downloadUrl: `/api/relatorios/exportacoes/${job.id}?download=1`,
      mensagem: "Relatorio enfileirado. O arquivo ficara disponivel quando o processamento terminar.",
    },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
