import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  SarhEscopoSincronizacaoError,
  resolverEscopoSincronizacaoSarh,
} from "@/modules/integracoes/sarh/application/services/sarh-escopo-sync.service";
import type {
  SarhEndpointKey,
  SarhResumoExecucao,
  SarhSyncProgress,
  TipoExecucaoSarh,
} from "@/modules/integracoes/sarh/domain/sarh.types";

export const runtime = "nodejs";

const PERMISSOES_SINCRONIZAR_SARH = new Set([
  "integracoes-sarh:executar:global",
  "integracoes-sarh:simular:global",
  "integracoes-sarh:configurar:global",
  "integracoes:sincronizar:global",
  "integracoes:gerenciar:global",
]);

const ENDPOINTS_VALIDOS = new Set<SarhEndpointKey>([
  "empresas",
  "lotacoes",
  "cargos",
  "servidores",
  "estagiarios",
  "prestadores",
  "voluntarios",
  "lotacoesServidores",
  "tiposAfastamento",
  "afastamentos",
  "ferias",
  "chefias",
  "substituicoes",
  "calendarios",
]);

const ENDPOINTS_COMPATIVEIS_MATRICULA = new Set<SarhEndpointKey>([
  "servidores",
  "estagiarios",
  "prestadores",
  "voluntarios",
  "lotacoesServidores",
  "afastamentos",
  "ferias",
  "chefias",
  "substituicoes",
  "calendarios",
]);

const ENDPOINTS_PADRAO_MATRICULA: SarhEndpointKey[] = [
  "servidores",
  "estagiarios",
  "prestadores",
  "voluntarios",
  "lotacoesServidores",
  "afastamentos",
  "ferias",
  "chefias",
  "substituicoes",
  "calendarios",
];

type SincronizarSarhRequest = {
  modo?: "simulacao" | "aplicar";
  tipo?: TipoExecucaoSarh;
  endpoints?: SarhEndpointKey[];
  orgaoId?: string;
  matricula?: string;
  codigoUnidadeSarh?: number;
  codigoCargoSarh?: number;
};

type JobEstado =
  | "waiting"
  | "delayed"
  | "active"
  | "completed"
  | "failed"
  | "unknown"
  | "cancelled";

function usuarioPodeSincronizar(permissoes: string[]) {
  return permissoes.some((permissao) =>
    PERMISSOES_SINCRONIZAR_SARH.has(permissao),
  );
}

function normalizarEndpoints(endpoints: unknown, matricula?: string) {
  if (!Array.isArray(endpoints)) {
    return matricula ? ENDPOINTS_PADRAO_MATRICULA : undefined;
  }

  const validos = endpoints.filter((endpoint): endpoint is SarhEndpointKey =>
    ENDPOINTS_VALIDOS.has(endpoint as SarhEndpointKey),
  );

  if (!matricula) {
    return validos;
  }

  const compativeis = validos.filter((endpoint) =>
    ENDPOINTS_COMPATIVEIS_MATRICULA.has(endpoint),
  );

  return compativeis.length ? compativeis : ENDPOINTS_PADRAO_MATRICULA;
}

function isSarhSyncProgress(valor: unknown): valor is SarhSyncProgress {
  return Boolean(
    valor &&
      typeof valor === "object" &&
      "percentualGeral" in valor &&
      "percentualEndpoint" in valor,
  );
}

function usuarioPodeAcessarJob(params: {
  escopoUsuario: Awaited<ReturnType<typeof obterEscopoOrgaoDaSessao>>;
  escopoJob?: { global: boolean; orgaoIds: string[] };
}) {
  if (params.escopoUsuario.global) {
    return true;
  }

  if (!params.escopoJob || params.escopoJob.global) {
    return false;
  }

  return params.escopoJob.orgaoIds.some((orgaoId) =>
    params.escopoUsuario.orgaoIds.includes(orgaoId),
  );
}

async function validarAcesso() {
  const session = await auth();
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  if (!session?.user) {
    return {
      erro: NextResponse.json({ message: "Não autenticado." }, { status: 401 }),
      session: null,
    };
  }

  if (!usuarioPodeSincronizar(permissoes)) {
    return {
      erro: NextResponse.json({ message: "Acesso negado." }, { status: 403 }),
      session: null,
    };
  }

  return { erro: null, session };
}

async function postSincronizarSarh(request: Request) {
  const acesso = await validarAcesso();

  if (acesso.erro || !acesso.session) {
    return acesso.erro;
  }

  const payload = (await request.json().catch(() => ({}))) as
    SincronizarSarhRequest | Record<string, never>;
  const escopoUsuario = await obterEscopoOrgaoDaSessao();
  let escopoSincronizacao;

  try {
    escopoSincronizacao = await resolverEscopoSincronizacaoSarh({
      escopo: escopoUsuario,
      orgaoId: payload.orgaoId,
      codigoUnidadeSarh: payload.codigoUnidadeSarh,
    });
  } catch (error) {
    if (error instanceof SarhEscopoSincronizacaoError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    throw error;
  }

  const { enfileirarSincronizacaoSarh, progressoSarhAgendado } = await import(
    "@/modules/integracoes/sarh/application/queues/sarh-sync-queue"
  );
  const { garantirSarhSyncWorkerAutomatico } = await import(
    "@/modules/integracoes/sarh/application/workers/sarh-sync-worker-runtime"
  );

  await garantirSarhSyncWorkerAutomatico();

  const modo = payload.modo ?? "simulacao";
  const matricula = payload.matricula?.trim() || undefined;
  const endpoints = normalizarEndpoints(payload.endpoints, matricula);
  const job = await enfileirarSincronizacaoSarh({
    tipo:
      payload.tipo ??
      (modo === "aplicar" ? "SINCRONIZACAO_COMPLETA" : "SIMULACAO"),
    modoSimulacao: modo !== "aplicar",
    orgaoId: escopoSincronizacao.orgaoIds[0] ?? null,
    endpoints,
    matricula,
    codigoUnidadeSarh: escopoSincronizacao.codigoUnidadeSarh,
    codigosUnidadesSarhPermitidos:
      escopoSincronizacao.codigosUnidadesSarhPermitidos,
    codigoCargoSarh: payload.codigoCargoSarh,
    iniciadoPorUsuarioId: acesso.session.user.id,
    escopoSincronizacao: {
      global: escopoSincronizacao.global,
      orgaoIds: escopoSincronizacao.orgaoIds,
    },
  });

  return NextResponse.json({
    jobId: job.id,
    estado: await job.getState(),
    progresso: isSarhSyncProgress(job.progress)
      ? job.progress
      : progressoSarhAgendado(),
  });
}

async function getSincronizarSarh(request: Request) {
  const acesso = await validarAcesso();

  if (acesso.erro) {
    return acesso.erro;
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  const { obterSarhSyncQueue, progressoSarhAgendado } = await import(
    "@/modules/integracoes/sarh/application/queues/sarh-sync-queue"
  );
  const job = jobId ? await obterSarhSyncQueue().getJob(jobId) : null;

  if (!job) {
    return NextResponse.json(
      { message: "Sincronização SARH não encontrada." },
      { status: 404 },
    );
  }

  const escopoUsuario = await obterEscopoOrgaoDaSessao();

  if (
    !usuarioPodeAcessarJob({
      escopoUsuario,
      escopoJob: job.data.escopoSincronizacao,
    })
  ) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const estado = await job.getState();
  const progresso = isSarhSyncProgress(job.progress)
    ? job.progress
    : progressoSarhAgendado();

  return NextResponse.json({
    jobId: job.id,
    estado,
    progresso,
    resultado: estado === "completed"
      ? (job.returnvalue as SarhResumoExecucao | null)
      : null,
    erro: estado === "failed" ? job.failedReason : null,
  });
}

async function deleteSincronizarSarh(request: Request) {
  const acesso = await validarAcesso();

  if (acesso.erro) {
    return acesso.erro;
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  const { obterSarhSyncQueue, progressoSarhAgendado } = await import(
    "@/modules/integracoes/sarh/application/queues/sarh-sync-queue"
  );
  const job = jobId ? await obterSarhSyncQueue().getJob(jobId) : null;

  if (!job) {
    return NextResponse.json(
      { message: "Sincronizacao SARH nao encontrada." },
      { status: 404 },
    );
  }

  const escopoUsuario = await obterEscopoOrgaoDaSessao();

  if (
    !usuarioPodeAcessarJob({
      escopoUsuario,
      escopoJob: job.data.escopoSincronizacao,
    })
  ) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const estado = await job.getState();
  const progresso = isSarhSyncProgress(job.progress)
    ? job.progress
    : progressoSarhAgendado();
  const progressoCancelado: SarhSyncProgress = {
    ...progresso,
    percentualGeral:
      estado === "waiting" || estado === "delayed"
        ? progresso.percentualGeral
        : 100,
    percentualEndpoint:
      estado === "waiting" || estado === "delayed"
        ? progresso.percentualEndpoint
        : 100,
    etapa: "Cancelamento solicitado pelo usuario.",
    status: "CANCELADA",
  };

  if (progresso.execucaoId) {
    const { prisma } = await import("@/shared/infrastructure/database/prisma");
    await prisma.integracaoSarhExecucao.updateMany({
      where: {
        id: progresso.execucaoId,
        status: { in: ["AGENDADA", "EM_EXECUCAO"] },
      },
      data: {
        status: "CANCELADA",
        mensagemErro: "Cancelamento solicitado pelo usuario.",
        finalizadoEm: new Date(),
      },
    });
  }

  await job.updateProgress(progressoCancelado);

  if (estado === "waiting" || estado === "delayed") {
    await job.remove();
  }

  return NextResponse.json({
    jobId: job.id,
    estado: "cancelled" satisfies JobEstado,
    progresso: progressoCancelado,
    resultado: null,
    erro: null,
  });
}

export const POST = withHttpMetrics(
  "/api/integracoes/sarh/sincronizar",
  postSincronizarSarh,
);
export const GET = withHttpMetrics(
  "/api/integracoes/sarh/sincronizar",
  getSincronizarSarh,
);
export const DELETE = withHttpMetrics(
  "/api/integracoes/sarh/sincronizar",
  deleteSincronizarSarh,
);
