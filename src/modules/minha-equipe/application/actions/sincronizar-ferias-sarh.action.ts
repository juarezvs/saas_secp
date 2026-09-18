"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  enfileirarSincronizacaoSarh,
  obterJobAtualizacaoAutomaticaSarh,
  obterSarhSyncQueue,
  progressoSarhAgendado,
  registrarJobAtualizacaoAutomaticaSarh,
} from "@/modules/integracoes/sarh/application/queues/sarh-sync-queue";
import {
  SarhEscopoSincronizacaoError,
  resolverEscopoSincronizacaoSarh,
} from "@/modules/integracoes/sarh/application/services/sarh-escopo-sync.service";
import { listarIdsUnidadesSubordinadasNaData } from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const PERMISSOES_SINCRONIZAR_FERIAS_SARH = [
  "programacao-ferias:consultar:subordinados",
  "programacao-ferias:consultar:seccional",
  "programacao-ferias:consultar:global",
  "minha-equipe:consultar:chefia",
  "integracoes-sarh:executar:global",
  "integracoes:sincronizar:global",
  "integracoes:gerenciar:global",
  "integracoes:gerenciar:seccional",
];

type PermissaoSessao = Awaited<ReturnType<typeof obterPermissoesDaSessao>>;

export type ResultadoSincronizacaoFeriasSarh = {
  ok: boolean;
  jobId?: string;
  estado?: string;
  mensagem?: string;
};

function usuarioPodeDispararSincronizacaoFerias(params: {
  perfilAtivoCodigo?: string;
  permissoes: string[];
}) {
  return PERMISSOES_SINCRONIZAR_FERIAS_SARH.some(
    (permissao) =>
      possuiPermissaoNaLista(params.permissoes, permissao) &&
      usuarioPossuiPermissaoNoPerfil(
        params.perfilAtivoCodigo,
        params.permissoes,
        permissao,
      ),
  );
}

function validarPermissao(permissao: PermissaoSessao) {
  return Boolean(
    permissao.permitido &&
      permissao.usuarioId &&
      usuarioPodeDispararSincronizacaoFerias({
        perfilAtivoCodigo: permissao.perfilAtivoCodigo,
        permissoes: permissao.permissoes,
      }),
  );
}

function dataReferenciaSegura(valor?: string) {
  if (!valor?.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date();
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) ? new Date() : data;
}

async function resolverEscopoHierarquia(params: {
  permissao: PermissaoSessao;
  dataReferencia?: string;
}) {
  if (!params.permissao.usuarioId) return null;

  const perfilChefia =
    params.permissao.perfilAtivoCodigo?.toUpperCase() === "CHEFIA";
  const consultaSubordinados = possuiPermissaoNaLista(
    params.permissao.permissoes,
    "programacao-ferias:consultar:subordinados",
  );
  const consultaAmpla =
    possuiPermissaoNaLista(
      params.permissao.permissoes,
      "programacao-ferias:consultar:seccional",
    ) ||
    possuiPermissaoNaLista(
      params.permissao.permissoes,
      "programacao-ferias:consultar:global",
    );

  if (consultaAmpla || (!perfilChefia && !consultaSubordinados)) return null;

  const unidadeIds = await listarIdsUnidadesSubordinadasNaData({
    usuarioId: params.permissao.usuarioId,
    data: dataReferenciaSegura(params.dataReferencia),
  });

  if (unidadeIds.length === 0) {
    throw new SarhEscopoSincronizacaoError(
      "Perfil ativo sem unidades subordinadas para sincronizar férias.",
    );
  }

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const unidades = await prisma.unidadeOrganizacional.findMany({
    where: {
      id: { in: unidadeIds },
      ativo: true,
      codigoExternoSarh: { not: null },
      ...(escopoOrgao.global
        ? {}
        : { orgaoId: { in: escopoOrgao.orgaoIds } }),
    },
    select: { id: true, orgaoId: true, codigoExternoSarh: true },
  });
  const orgaoIds = Array.from(new Set(unidades.map((unidade) => unidade.orgaoId)));
  const codigosUnidadesSarh = Array.from(
    new Set(
      unidades
        .map((unidade) => unidade.codigoExternoSarh)
        .filter((codigo): codigo is number => codigo !== null),
    ),
  ).sort((a, b) => a - b);

  if (orgaoIds.length !== 1 || codigosUnidadesSarh.length === 0) {
    throw new SarhEscopoSincronizacaoError(
      "A hierarquia da chefia precisa estar vinculada a uma única seccional e possuir códigos SARH.",
    );
  }

  const idsOrdenados = unidades.map((unidade) => unidade.id).sort();
  const escopoChave = createHash("sha256")
    .update(
      [
        params.permissao.usuarioId,
        params.permissao.perfilAtivoCodigo ?? "",
        orgaoIds[0],
        ...idsOrdenados,
      ].join(":"),
    )
    .digest("hex");

  return {
    escopoChave,
    orgaoId: orgaoIds[0],
    orgaoIds,
    unidadeIds: idsOrdenados,
    codigosUnidadesSarh,
  };
}

async function solicitarSincronizacao(params: {
  permissao: PermissaoSessao;
  dataReferencia?: string;
  automatica: boolean;
}): Promise<ResultadoSincronizacaoFeriasSarh> {
  if (!validarPermissao(params.permissao)) {
    return { ok: false, mensagem: "Sem permissão para sincronizar férias." };
  }

  const hierarquia = await resolverEscopoHierarquia({
    permissao: params.permissao,
    dataReferencia: params.dataReferencia,
  });

  if (params.automatica && !hierarquia) {
    return { ok: true, estado: "ignorada" };
  }

  if (params.automatica && hierarquia) {
    const jobIdExistente = await obterJobAtualizacaoAutomaticaSarh(
      hierarquia.escopoChave,
    );
    if (jobIdExistente) {
      const jobExistente = await obterSarhSyncQueue().getJob(jobIdExistente);
      return {
        ok: true,
        jobId: jobExistente?.id,
        estado: jobExistente ? await jobExistente.getState() : "atualizada",
      };
    }
  }

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const escopoSincronizacao = hierarquia
    ? {
        global: false,
        orgaoIds: hierarquia.orgaoIds,
        codigoUnidadeSarh: undefined,
        codigosUnidadesSarhPermitidos: hierarquia.codigosUnidadesSarh,
      }
    : await resolverEscopoSincronizacaoSarh({ escopo: escopoOrgao });
  const job = await enfileirarSincronizacaoSarh({
    tipo: "SINCRONIZACAO_INCREMENTAL",
    modoSimulacao: false,
    orgaoId: hierarquia?.orgaoId ?? escopoSincronizacao.orgaoIds[0] ?? null,
    endpoints: ["ferias"],
    codigoUnidadeSarh: escopoSincronizacao.codigoUnidadeSarh,
    codigosUnidadesSarhPermitidos:
      escopoSincronizacao.codigosUnidadesSarhPermitidos,
    iniciadoPorUsuarioId: params.permissao.usuarioId ?? null,
    escopoChave: hierarquia?.escopoChave,
    unidadeIdsEscopo: hierarquia?.unidadeIds,
    origemSolicitacao: params.automatica
      ? "AUTOMATICA_TELA_FERIAS"
      : "MANUAL_TELA_FERIAS",
    escopoSincronizacao: {
      global: escopoSincronizacao.global,
      orgaoIds: escopoSincronizacao.orgaoIds,
    },
  });

  if (!job.progress) await job.updateProgress(progressoSarhAgendado());
  if (params.automatica && hierarquia && job.id) {
    await registrarJobAtualizacaoAutomaticaSarh({
      escopoChave: hierarquia.escopoChave,
      jobId: job.id,
    });
  }

  revalidatePath("/minha-equipe/ferias");
  return { ok: true, jobId: job.id, estado: await job.getState() };
}

function redirecionarComStatus(params: {
  formData: FormData;
  status: "ok" | "erro";
  jobId?: string;
}) {
  const redirectTo = String(params.formData.get("redirectTo") ?? "").trim();
  const destino = redirectTo.startsWith("/minha-equipe/ferias")
    ? redirectTo
    : "/minha-equipe/ferias";
  const separador = destino.includes("?") ? "&" : "?";
  const job = params.jobId ? `&feriasJob=${encodeURIComponent(params.jobId)}` : "";
  redirect(`${destino}${separador}feriasSync=${params.status}${job}`);
}

export async function sincronizarFeriasSarhEquipeAction(formData: FormData) {
  let resultado: ResultadoSincronizacaoFeriasSarh;

  try {
    resultado = await solicitarSincronizacao({
      permissao: await obterPermissoesDaSessao(),
      dataReferencia: String(formData.get("dataReferencia") ?? ""),
      automatica: false,
    });
  } catch (error) {
    resultado = { ok: false };
    if (!(error instanceof SarhEscopoSincronizacaoError)) {
      console.error("[FERIAS SARH] Falha ao solicitar sincronização:", error);
    }
  }

  redirecionarComStatus({
    formData,
    status: resultado.ok ? "ok" : "erro",
    jobId: resultado.jobId,
  });
}

export async function sincronizarFeriasSarhEquipeAutomaticamenteAction(params: {
  dataReferencia: string;
}) {
  try {
    return await solicitarSincronizacao({
      permissao: await obterPermissoesDaSessao(),
      dataReferencia: params.dataReferencia,
      automatica: true,
    });
  } catch (error) {
    if (!(error instanceof SarhEscopoSincronizacaoError)) {
      console.error("[FERIAS SARH] Falha na atualização automática:", error);
    }
    return { ok: false, mensagem: "Não foi possível atualizar as férias." };
  }
}

export async function consultarJobSincronizacaoFeriasSarhAction(jobId: string) {
  const permissao = await obterPermissoesDaSessao();
  if (!validarPermissao(permissao)) return { ok: false, estado: "negado" };

  const job = await obterSarhSyncQueue().getJob(jobId);
  if (!job) return { ok: true, estado: "concluido" };

  const estado = await job.getState();
  return {
    ok: true,
    estado,
    progresso: job.progress,
    falhou: estado === "failed",
  };
}
