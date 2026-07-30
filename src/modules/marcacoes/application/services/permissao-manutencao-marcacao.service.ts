import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const PERMISSAO_EXCLUIR_MARCACOES = "marcacoes:excluir:global";
export const PERMISSAO_EXCLUIR_MARCACOES_SECCIONAL =
  "marcacoes:excluir:seccional";

const PERMISSOES_EXCLUIR_MARCACOES = [
  PERMISSAO_EXCLUIR_MARCACOES,
  PERMISSAO_EXCLUIR_MARCACOES_SECCIONAL,
];

function textoUnidadeNutec(
  unidade?: {
    codigo?: string | null;
    sigla?: string | null;
    nome?: string | null;
  } | null,
) {
  const texto = [unidade?.codigo, unidade?.sigla, unidade?.nome]
    .filter(Boolean)
    .join(" ")
    .toLocaleUpperCase("pt-BR");

  return texto.includes("NUTEC");
}

export async function usuarioAtualEhNutec() {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  return usuarioEhNutec(session.user.id);
}

export async function usuarioEhNutec(usuarioId: string) {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    select: {
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        select: {
          unidade: {
            select: {
              codigo: true,
              sigla: true,
              nome: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });

  return (
    servidor?.lotacoes.some((lotacao) => textoUnidadeNutec(lotacao.unidade)) ??
    false
  );
}

export async function usuarioPodeExcluirMarcacao(params: {
  usuarioId?: string | null;
  permissoes: string[];
  escopoGlobal?: boolean;
  orgaoIdsPermitidos?: string[];
  servidorOrgaoId?: string | null;
}) {
  const possuiPermissao = PERMISSOES_EXCLUIR_MARCACOES.some((permissao) =>
    params.permissoes.includes(permissao),
  );

  if (!possuiPermissao) {
    return params.usuarioId ? usuarioEhNutec(params.usuarioId) : false;
  }

  if (params.escopoGlobal) {
    return true;
  }

  if (
    params.servidorOrgaoId &&
    params.orgaoIdsPermitidos?.includes(params.servidorOrgaoId)
  ) {
    return true;
  }

  return params.usuarioId ? usuarioEhNutec(params.usuarioId) : false;
}

export async function usuarioAtualPodeExcluirMarcacao() {
  const session = await auth();
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  if (
    PERMISSOES_EXCLUIR_MARCACOES.some((permissao) =>
      permissoes.includes(permissao),
    )
  ) {
    return true;
  }

  return usuarioAtualEhNutec();
}

export async function exigirUsuarioNutec() {
  if (!(await usuarioAtualEhNutec())) {
    throw new Error("Apenas usuarios lotados no NUTEC podem manter marcacoes.");
  }

  const session = await auth();
  const usuarioId = session?.user?.id;

  if (!usuarioId) {
    throw new Error("Usuario autenticado nao identificado.");
  }

  return {
    usuarioId,
  };
}

export async function exigirUsuarioPodeExcluirMarcacao(params?: {
  servidorOrgaoId?: string | null;
}) {
  const session = await auth();
  const usuarioId = session?.user?.id;
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  if (!usuarioId) {
    throw new Error("Usuario autenticado nao identificado.");
  }

  const podeExcluir = await usuarioPodeExcluirMarcacao({
    usuarioId,
    permissoes,
    escopoGlobal: escopoOrgao.global,
    orgaoIdsPermitidos: escopoOrgao.orgaoIds,
    servidorOrgaoId: params?.servidorOrgaoId,
  });

  if (!podeExcluir) {
    throw new Error(
      "Apenas usuarios com permissao especifica no escopo da seccional ou lotados no NUTEC podem excluir marcacoes.",
    );
  }

  return {
    usuarioId,
  };
}
