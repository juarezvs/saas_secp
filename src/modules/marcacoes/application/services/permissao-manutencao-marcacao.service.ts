import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const PERMISSAO_EXCLUIR_MARCACOES = "marcacoes:excluir:global";

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
}) {
  if (params.permissoes.includes(PERMISSAO_EXCLUIR_MARCACOES)) {
    return true;
  }

  return params.usuarioId ? usuarioEhNutec(params.usuarioId) : false;
}

export async function usuarioAtualPodeExcluirMarcacao() {
  const session = await auth();
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  if (permissoes.includes(PERMISSAO_EXCLUIR_MARCACOES)) {
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

export async function exigirUsuarioPodeExcluirMarcacao() {
  const session = await auth();
  const usuarioId = session?.user?.id;
  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  if (!usuarioId) {
    throw new Error("Usuario autenticado nao identificado.");
  }

  if (
    !permissoes.includes(PERMISSAO_EXCLUIR_MARCACOES) &&
    !(await usuarioAtualEhNutec())
  ) {
    throw new Error(
      "Apenas usuarios com permissao especifica ou lotados no NUTEC podem excluir marcacoes.",
    );
  }

  return {
    usuarioId,
  };
}
