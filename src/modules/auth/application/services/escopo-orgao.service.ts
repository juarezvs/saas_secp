import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { buscarUsuarioParaLoginPorMatricula } from "../../infrastructure/repositories/usuario-auth.repository";
import { escolherPerfilInicial } from "./perfil-servidor-prioritario.service";

export type EscopoOrgaoSessao = {
  global: boolean;
  orgaoIds: string[];
  orgaos: Array<{
    id: string;
    sigla: string;
    nome: string;
  }>;
};

const ORGAO_ID_SEM_ACESSO = "00000000-0000-4000-8000-000000000000";

export async function obterEscopoOrgaoDaSessao(): Promise<EscopoOrgaoSessao> {
  const session = await auth();

  if (!session?.user) {
    return { global: false, orgaoIds: [], orgaos: [] };
  }

  const usuario = await buscarUsuarioParaLoginPorMatricula(
    session.user.matricula,
  );

  if (!usuario) {
    return { global: false, orgaoIds: [], orgaos: [] };
  }

  const perfilPreferido =
    usuario.perfis.find(
      (perfil) => perfil.codigo === session.user.perfilAtivo?.codigo,
    ) ?? usuario.perfilAtivo;
  const perfilAtivo = escolherPerfilInicial({
    tipoUsuario: usuario.tipo,
    perfis: usuario.perfis,
    perfilPreferido,
    respeitarPerfilPreferido: Boolean(session.user.perfilAtivo),
  });

  let orgaos = perfilAtivo?.orgaos ?? [];

  if (!orgaos.length && usuario.orgaoId) {
    const orgaoServidor = await prisma.orgao.findFirst({
      where: {
        id: usuario.orgaoId,
        ativo: true,
      },
      select: {
        id: true,
        sigla: true,
        nome: true,
      },
    });

    orgaos = orgaoServidor ? [orgaoServidor] : [];
  }

  return {
    global: Boolean(perfilAtivo?.escopoGlobal),
    orgaoIds: orgaos.map((orgao) => orgao.id),
    orgaos,
  };
}

export function aplicarEscopoOrgaoId<
  T extends Record<string, unknown> & {
    orgaoId?: string;
    orgaoIdsPermitidos?: string[];
  },
>(
  params: T,
  escopo: EscopoOrgaoSessao,
): T {
  if (escopo.global) {
    return params;
  }

  if (params.orgaoId && escopo.orgaoIds.includes(params.orgaoId)) {
    return params;
  }

  if (params.orgaoId) {
    return {
      ...params,
      orgaoId: ORGAO_ID_SEM_ACESSO,
      orgaoIdsPermitidos: [ORGAO_ID_SEM_ACESSO],
    };
  }

  return {
    ...params,
    orgaoIdsPermitidos: escopo.orgaoIds.length
      ? escopo.orgaoIds
      : [ORGAO_ID_SEM_ACESSO],
  };
}

export function whereOrgaoPermitido(escopo: EscopoOrgaoSessao) {
  if (escopo.global) {
    return {};
  }

  return {
    id: {
      in: escopo.orgaoIds.length
        ? escopo.orgaoIds
        : [ORGAO_ID_SEM_ACESSO],
    },
  };
}
