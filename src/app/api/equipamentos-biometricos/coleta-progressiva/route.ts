import { auth } from "@/auth";
import {
  cancelarColetaRelogioProgressiva,
  iniciarColetaRelogioProgressiva,
  obterColetaRelogioProgressiva,
  type ColetaRelogioProgressivaModo,
} from "@/modules/integracoes/application/jobs/coleta-relogio-progressiva.jobs";

export const runtime = "nodejs";

function podeGerenciarEquipamentos(permissoes: string[]) {
  return (
    permissoes.includes("integracoes:gerenciar:global") ||
    permissoes.includes("afd:importar:global")
  );
}

function normalizarModo(valor: unknown): ColetaRelogioProgressivaModo {
  return valor === "SERVIDOR" ? "SERVIDOR" : "TODAS";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ mensagem: "Nao autenticado." }, { status: 401 });
  }

  if (!podeGerenciarEquipamentos(session.user.perfilAtivo?.permissoes ?? [])) {
    return Response.json(
      { mensagem: "Voce nao possui permissao para coletar marcacoes." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    equipamentoId?: unknown;
    modo?: unknown;
    nsrInicial?: unknown;
    quantidadePorLote?: unknown;
    limiteLotes?: unknown;
    reprocessarAoFinal?: unknown;
    servidorBusca?: unknown;
  } | null;

  const equipamentoId =
    typeof body?.equipamentoId === "string" ? body.equipamentoId.trim() : "";

  if (!equipamentoId) {
    return Response.json({ mensagem: "Equipamento nao informado." }, { status: 400 });
  }

  const modo = normalizarModo(body?.modo);
  const servidorBusca =
    typeof body?.servidorBusca === "string" ? body.servidorBusca.trim() : "";

  if (modo === "SERVIDOR" && !servidorBusca) {
    return Response.json(
      { mensagem: "Informe CPF ou matricula do servidor." },
      { status: 400 },
    );
  }

  const job = iniciarColetaRelogioProgressiva({
    equipamentoId,
    modo,
    nsrInicial:
      typeof body?.nsrInicial === "string" || typeof body?.nsrInicial === "number"
        ? body.nsrInicial
        : null,
    quantidadePorLote: Number(body?.quantidadePorLote ?? 100),
    limiteLotes: Number(body?.limiteLotes ?? 100),
    reprocessarAoFinal: Boolean(body?.reprocessarAoFinal),
    servidorBusca,
    usuarioIdAuditoria: session.user.id,
  });

  return Response.json(job);
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ mensagem: "Nao autenticado." }, { status: 401 });
  }

  if (!podeGerenciarEquipamentos(session.user.perfilAtivo?.permissoes ?? [])) {
    return Response.json(
      { mensagem: "Voce nao possui permissao para consultar a coleta." },
      { status: 403 },
    );
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  const job = jobId ? obterColetaRelogioProgressiva(jobId) : null;

  if (!job) {
    return Response.json({ mensagem: "Coleta nao encontrada." }, { status: 404 });
  }

  return Response.json(job);
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ mensagem: "Nao autenticado." }, { status: 401 });
  }

  if (!podeGerenciarEquipamentos(session.user.perfilAtivo?.permissoes ?? [])) {
    return Response.json(
      { mensagem: "Voce nao possui permissao para cancelar a coleta." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    jobId?: unknown;
    acao?: unknown;
  } | null;

  const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";

  if (!jobId || body?.acao !== "CANCELAR") {
    return Response.json({ mensagem: "Cancelamento invalido." }, { status: 400 });
  }

  const job = cancelarColetaRelogioProgressiva(jobId);

  if (!job) {
    return Response.json({ mensagem: "Coleta nao encontrada." }, { status: 404 });
  }

  return Response.json(job);
}
