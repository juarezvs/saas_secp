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

  const orgaoIdsPerfilAtivo = permissao.usuarioId
    ? await buscarOrgaoIdsDoPerfilAtivo(permissao)
    : [];
  const orgaoIdsSessao = permissao.orgaoIds ?? [];
  const orgaoIdsPermitidos = orgaoIdsPerfilAtivo.length
    ? orgaoIdsPerfilAtivo
    : orgaoIdsSessao;

  if (permitirEscopoGlobal) {
    return {
      permitirEscopoGlobal,
      orgaoIdsPermitidos,
    };
  }

  return {
    permitirEscopoGlobal,
    orgaoIdsPermitidos: orgaoIdsPermitidos.length
      ? orgaoIdsPermitidos
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

export function orgaoPodeSerVinculadoNoEscopoGestaoUsuarios(
  orgaoId: string,
  escopo: EscopoGestaoUsuarios,
) {
  if (escopo.orgaoIdsPermitidos.length > 0) {
    return escopo.orgaoIdsPermitidos.includes(orgaoId);
  }

  return escopo.permitirEscopoGlobal;
}

export function usuarioEstaNoEscopoGestaoUsuarios(
  usuario: {
    tipo?: string | null;
    servidor?: { orgaoId?: string | null } | null;
    perfis?: Array<{ orgaoId?: string | null }>;
  },
  escopo: EscopoGestaoUsuarios,
) {
  if (escopo.permitirEscopoGlobal) {
    return true;
  }

  if (
    usuario.servidor?.orgaoId &&
    orgaoEstaNoEscopoGestaoUsuarios(usuario.servidor.orgaoId, escopo)
  ) {
    return true;
  }

  if (
    usuario.perfis?.some(
      (perfil) =>
        perfil.orgaoId && orgaoEstaNoEscopoGestaoUsuarios(perfil.orgaoId, escopo),
    )
  ) {
    return true;
  }

  return (
    usuario.tipo === "SISTEMA" &&
    !usuario.servidor &&
    (usuario.perfis?.length ?? 0) === 0
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
