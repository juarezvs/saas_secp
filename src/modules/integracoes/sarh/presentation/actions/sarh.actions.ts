"use server";

import { revalidatePath } from "next/cache";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  SarhEscopoSincronizacaoError,
  resolverEscopoSincronizacaoSarh,
} from "../../application/services/sarh-escopo-sync.service";
import {
  enfileirarSincronizacaoSarh,
  progressoSarhAgendado,
} from "../../application/queues/sarh-sync-queue";
import { ENDPOINTS_PADRAO_SARH_MATRICULA } from "../../application/sarh-sync.dto";
import { garantirSarhSyncWorkerAutomatico } from "../../application/workers/sarh-sync-worker-runtime";
import type { SarhEndpointKey } from "../../domain/sarh.types";

export type SincronizarSarhActionState = {
  ok: boolean | null;
  mensagem: string;
  jobId?: string;
  execucaoId?: string;
  detalhes?: Record<string, unknown>;
};

type SarhEndpointOpcao = SarhEndpointKey | "pessoas";

const ENDPOINTS_PESSOAS: SarhEndpointKey[] = [
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
];

const PERMISSOES_SINCRONIZAR_SARH = [
  "integracoes-sarh:executar:global",
  "integracoes-sarh:simular:global",
  "integracoes-sarh:configurar:global",
  "integracoes:sincronizar:global",
  "integracoes:gerenciar:global",
  "integracoes:gerenciar:seccional",
];

const ENDPOINTS_COMPATIVEIS_MATRICULA = new Set<SarhEndpointKey>([
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

const ENDPOINTS_PADRAO_MATRICULA: SarhEndpointKey[] = [
  ...ENDPOINTS_PADRAO_SARH_MATRICULA,
];

function normalizarEndpointsPorMatricula(
  endpoints: SarhEndpointOpcao[],
  matricula?: string,
) {
  const endpointsExpandidos = Array.from(
    new Set(
      endpoints.flatMap((endpoint) =>
        endpoint === "pessoas" ? ENDPOINTS_PESSOAS : [endpoint],
      ),
    ),
  );

  if (!matricula) {
    return endpointsExpandidos.length ? endpointsExpandidos : undefined;
  }

  const compativeis = endpointsExpandidos.filter((endpoint) =>
    ENDPOINTS_COMPATIVEIS_MATRICULA.has(endpoint),
  );

  return compativeis.length ? compativeis : ENDPOINTS_PADRAO_MATRICULA;
}

export async function sincronizarSarhAction(
  formData: FormData,
): Promise<SincronizarSarhActionState> {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido) {
    return {
      ok: false,
      mensagem: "Sessao expirada. Faca login novamente.",
    };
  }

  const podeSincronizar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    PERMISSOES_SINCRONIZAR_SARH,
  );

  if (!podeSincronizar) {
    return {
      ok: false,
      mensagem: "Voce nao possui permissao para sincronizar o SARH.",
    };
  }

  const modo = String(formData.get("modo") ?? "simulacao");
  const matricula = String(formData.get("matricula") ?? "").trim() || undefined;
  const codigoUnidadeSarh =
    Number(String(formData.get("codigoUnidadeSarh") ?? "")) || undefined;
  const orgaoId = String(formData.get("orgaoId") ?? "").trim() || null;
  const endpoints = formData
    .getAll("endpoints")
    .map(String) as SarhEndpointOpcao[];
  const endpointsNormalizados = normalizarEndpointsPorMatricula(
    endpoints,
    matricula,
  );
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  let escopoSincronizacao;

  try {
    escopoSincronizacao = await resolverEscopoSincronizacaoSarh({
      escopo: escopoOrgao,
      orgaoId,
      codigoUnidadeSarh,
    });
  } catch (error) {
    if (error instanceof SarhEscopoSincronizacaoError) {
      return {
        ok: false,
        mensagem: error.message,
      };
    }

    throw error;
  }

  try {
    await garantirSarhSyncWorkerAutomatico();

    const job = await enfileirarSincronizacaoSarh({
      tipo: modo === "aplicar" ? "SINCRONIZACAO_COMPLETA" : "SIMULACAO",
      modoSimulacao: modo !== "aplicar",
      orgaoId: escopoSincronizacao.orgaoIds[0] ?? null,
      endpoints: endpointsNormalizados,
      matricula,
      codigoUnidadeSarh: escopoSincronizacao.codigoUnidadeSarh,
      codigosUnidadesSarhPermitidos:
        escopoSincronizacao.codigosUnidadesSarhPermitidos,
      iniciadoPorUsuarioId: permissao.usuarioId ?? null,
      escopoSincronizacao: {
        global: escopoSincronizacao.global,
        orgaoIds: escopoSincronizacao.orgaoIds,
      },
    });
    const progresso = progressoSarhAgendado();

    revalidatePath("/integracoes");
    revalidatePath("/administracao/integracoes/sarh");

    return {
      ok: true,
      mensagem:
        "Sincronizacao SARH enviada para a fila. Acompanhe o andamento pelo status da tela.",
      execucaoId: progresso.execucaoId,
      jobId: String(job.id),
      detalhes: {
        jobId: job.id,
        estado: await job.getState(),
        progresso,
      },
    };
  } catch (error) {
    return {
      ok: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao sincronizar SARH.",
    };
  }
}

export async function sincronizarSarhComProgressoAction(
  _estadoAnterior: SincronizarSarhActionState,
  formData: FormData,
): Promise<SincronizarSarhActionState> {
  return sincronizarSarhAction(formData);
}
