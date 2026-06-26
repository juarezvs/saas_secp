import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

function textoUnidadeNutec(unidade?: {
  codigo?: string | null;
  sigla?: string | null;
  nome?: string | null;
} | null) {
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

  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId: session.user.id,
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

  return servidor?.lotacoes.some((lotacao) =>
    textoUnidadeNutec(lotacao.unidade),
  ) ?? false;
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
