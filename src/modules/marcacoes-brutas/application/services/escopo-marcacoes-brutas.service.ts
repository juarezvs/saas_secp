import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import type { EscopoOrgaoSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";

export const MARCACOES_BRUTAS_SEM_ACESSO_ID =
  "00000000-0000-4000-8000-000000000000";

type PermissaoSessaoMarcacoesBrutas = {
  usuarioId?: string;
  perfilAtivoCodigo?: string | null;
  permissoes: string[];
};

export async function resolverEscopoMarcacoesBrutas(
  permissao: PermissaoSessaoMarcacoesBrutas,
  escopoOrgao: EscopoOrgaoSessao,
) {
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    permissoes: permissao.permissoes,
  });

  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : [MARCACOES_BRUTAS_SEM_ACESSO_ID];

  if (!perfilChefiaAtivo || !permissao.usuarioId) {
    return {
      perfilChefiaAtivo,
      orgaoIdsPermitidos,
      servidorIdsPermitidos: undefined,
    };
  }

  const [servidorProprio, servidoresChefia] = await Promise.all([
    buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId),
    listarServidoresParaEspelhoPonto({
      usuarioId: permissao.usuarioId,
      escopo: "chefia",
    }),
  ]);

  return {
    perfilChefiaAtivo,
    orgaoIdsPermitidos,
    servidorIdsPermitidos: Array.from(
      new Set([
        ...(servidorProprio ? [servidorProprio.id] : []),
        ...servidoresChefia.map((servidor) => servidor.id),
      ]),
    ),
  };
}

export function resolverOrgaoIdsFiltroMarcacoesBrutas(params: {
  orgaoId?: string | null;
  orgaoIdsPermitidos?: string[];
}) {
  const orgaoId = params.orgaoId?.trim();

  if (!orgaoId) {
    return params.orgaoIdsPermitidos;
  }

  if (
    params.orgaoIdsPermitidos &&
    !params.orgaoIdsPermitidos.includes(orgaoId)
  ) {
    return [MARCACOES_BRUTAS_SEM_ACESSO_ID];
  }

  return [orgaoId];
}
