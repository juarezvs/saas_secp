"use server";

import { revalidatePath } from "next/cache";
import {
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  SarhEscopoSincronizacaoError,
  resolverEscopoSincronizacaoSarh,
} from "../../application/services/sarh-escopo-sync.service";
import { SincronizarSarhUseCase } from "../../application/use-cases/sincronizar-sarh.use-case";
import type { SarhEndpointKey } from "../../domain/sarh.types";

export type SincronizarSarhActionState = {
  ok: boolean | null;
  mensagem: string;
  execucaoId?: string;
  detalhes?: Record<string, unknown>;
};

const PERMISSOES_SINCRONIZAR_SARH = [
  "integracoes-sarh:executar:global",
  "integracoes-sarh:simular:global",
  "integracoes-sarh:configurar:global",
  "integracoes:sincronizar:global",
  "integracoes:gerenciar:global",
];

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
];

function normalizarEndpointsPorMatricula(
  endpoints: SarhEndpointKey[],
  matricula?: string,
) {
  if (!matricula) {
    return endpoints.length ? endpoints : undefined;
  }

  const compativeis = endpoints.filter((endpoint) =>
    ENDPOINTS_COMPATIVEIS_MATRICULA.has(endpoint),
  );

  return compativeis.length ? compativeis : ENDPOINTS_PADRAO_MATRICULA;
}

export async function sincronizarSarhAction(formData: FormData): Promise<SincronizarSarhActionState> {
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
  const endpoints = formData.getAll("endpoints").map(String) as SarhEndpointKey[];
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

  const useCase = new SincronizarSarhUseCase(prisma);

  try {
    const resultado = await useCase.execute({
      tipo: modo === "aplicar" ? "SINCRONIZACAO_COMPLETA" : "SIMULACAO",
      modoSimulacao: modo !== "aplicar",
      orgaoId: escopoSincronizacao.orgaoIds[0] ?? null,
      endpoints: endpointsNormalizados,
      matricula,
      codigoUnidadeSarh: escopoSincronizacao.codigoUnidadeSarh,
      codigosUnidadesSarhPermitidos:
        escopoSincronizacao.codigosUnidadesSarhPermitidos,
      iniciadoPorUsuarioId: permissao.usuarioId ?? null,
    });

    revalidatePath("/integracoes");
    revalidatePath("/administracao/integracoes/sarh");

    return {
      ok: true,
      mensagem: resultado.modoSimulacao
        ? "Simulação SARH concluída. Nenhum dado de domínio foi alterado."
        : "Sincronização SARH aplicada com sucesso.",
      execucaoId: resultado.execucaoId,
      detalhes: resultado,
    };
  } catch (error) {
    return {
      ok: false,
      mensagem: error instanceof Error ? error.message : "Falha inesperada ao sincronizar SARH.",
    };
  }
}


export async function sincronizarSarhComProgressoAction(
  _estadoAnterior: SincronizarSarhActionState,
  formData: FormData,
): Promise<SincronizarSarhActionState> {
  return sincronizarSarhAction(formData);
}
