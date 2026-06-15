import { auth } from "@/auth";
import {
  enfileirarReprocessamentoGlobal,
  reprocessamentoGlobalQueue,
} from "@/modules/marcacoes-brutas/application/queues/reprocessamento-global-queue";

export const runtime = "nodejs";

function podeReprocessar(permissoes: string[]) {
  return (
    permissoes.includes("marcacoes:gerenciar:global") ||
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("afd:importar:global")
  );
}

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ mensagem: "Não autenticado." }, { status: 401 });
  }

  if (!podeReprocessar(session.user.perfilAtivo?.permissoes ?? [])) {
    return Response.json(
      { mensagem: "Você não possui permissão para reprocessar todos." },
      { status: 403 },
    );
  }

  const job = await enfileirarReprocessamentoGlobal(session.user.id);

  return Response.json({
    jobId: job.id,
    estado: await job.getState(),
    progresso: job.progress,
  });
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ mensagem: "Não autenticado." }, { status: 401 });
  }

  if (!podeReprocessar(session.user.perfilAtivo?.permissoes ?? [])) {
    return Response.json(
      { mensagem: "Você não possui permissão para consultar o processamento." },
      { status: 403 },
    );
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  const job = jobId ? await reprocessamentoGlobalQueue.getJob(jobId) : null;

  if (!job) {
    return Response.json(
      { mensagem: "Processamento não encontrado." },
      { status: 404 },
    );
  }

  const estado = await job.getState();

  return Response.json({
    jobId: job.id,
    estado,
    progresso: job.progress,
    resultado: estado === "completed" ? job.returnvalue : null,
    erro: estado === "failed" ? job.failedReason : null,
  });
}
