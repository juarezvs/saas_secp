import { prisma } from "@/shared/infrastructure/database/prisma";
import type { ResultadoPermissao } from "@/modules/auth/application/services/permissao.service";
import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";

const ORGAO_ID_SEM_ACESSO = "00000000-0000-4000-8000-000000000000";

export type EscopoGestaoUsuarios = {
  permitirEscopoGlobal: boolean;
  orgaoIdsPermitidos: string[];
};

export async function resolverEscopoGestaoUsuarios(
  permissao: ResultadoPermissao,
): Promise<EscopoGestaoUsuarios> {
  const permitirEscopoGlobal = perfilEhAdministradorSistema({
    codigo: permissao.perfilAtivoCodigo,
  });

  if (permitirEscopoGlobal) {
    return {
      permitirEscopoGlobal,
      orgaoIdsPermitidos: [],
    };
  }

  const orgaoIdsPerfilAtivo = permissao.usuarioId
    ? await buscarOrgaoIdsDoPerfilAtivo(permissao)
    : [];

  return {
    permitirEscopoGlobal,
    orgaoIdsPermitidos: orgaoIdsPerfilAtivo.length
      ? orgaoIdsPerfilAtivo
      : [ORGAO_ID_SEM_ACESSO],
  };
}

export function orgaoEstaNoEscopoGestaoUsuarios(
  orgaoId: string,
  escopo: EscopoGestaoUsuarios,
) {
  return (
    escopo.permitirEscopoGlobal || escopo.orgaoIdsPermitidos.includes(orgaoId)
  );
}

async function buscarOrgaoIdsDoPerfilAtivo(permissao: ResultadoPermissao) {
  if (!permissao.usuarioId || !permissao.perfilAtivoId) {
    return permissao.orgaoIds ?? [];
  }

  const vinculos = await prisma.usuarioPerfil.findMany({
    where: {
      usuarioId: permissao.usuarioId,
      perfilId: permissao.perfilAtivoId,
      ativo: true,
      orgaoId: {
        not: null,
      },
    },
    select: {
      orgaoId: true,
    },
    distinct: ["orgaoId"],
  });

  return vinculos
    .map((vinculo) => vinculo.orgaoId)
    .filter((orgaoId): orgaoId is string => Boolean(orgaoId));
}
