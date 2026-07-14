import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import {
  relatorioExportacaoQueue,
  type RelatorioExportacaoJobResult,
} from "@/modules/relatorios/application/queues/relatorio-exportacao-queue";
import { lerRelatorioExportado } from "@/modules/relatorios/application/services/relatorio-exportacao-storage.service";

export const runtime = "nodejs";

type RelatorioExportacaoRouteParams = {
  params: Promise<{
    jobId: string;
  }>;
};

async function getRelatorioExportacao(
  request: Request,
  { params }: RelatorioExportacaoRouteParams,
) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", { status: 401 });
  }

  const { jobId } = await params;
  const job = await relatorioExportacaoQueue.getJob(jobId);

  if (!job) {
    return new Response("Exportacao nao encontrada.", { status: 404 });
  }

  if (job.data.usuarioId !== session.user.id) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const estado = await job.getState();
  const resultado = job.returnvalue as RelatorioExportacaoJobResult | null;

  if (url.searchParams.get("download") === "1") {
    if (estado !== "completed" || !resultado) {
      return Response.json(
        {
          jobId,
          estado,
          progresso: job.progress,
          mensagem: "Relatorio ainda nao concluido.",
        },
        { status: 202 },
      );
    }

    const arquivo = await lerRelatorioExportado(resultado);

    return new Response(new Uint8Array(arquivo), {
      headers: {
        "Content-Type": resultado.contentType,
        "Content-Disposition": `attachment; filename="${resultado.nomeArquivo}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return Response.json(
    {
      jobId,
      estado,
      progresso: job.progress,
      resultado:
        estado === "completed" && resultado
          ? {
              nomeArquivo: resultado.nomeArquivo,
              tamanhoBytes: resultado.tamanhoBytes,
              finalizadoEm: resultado.finalizadoEm,
              downloadUrl: `/api/relatorios/exportacoes/${jobId}?download=1`,
            }
          : null,
      erro: estado === "failed" ? job.failedReason : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export const GET = withHttpMetrics(
  "/api/relatorios/exportacoes/[jobId]",
  getRelatorioExportacao,
);
