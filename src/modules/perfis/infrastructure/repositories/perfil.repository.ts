import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarPermissoesOrdenadas() {
  return prisma.permissao.findMany({
    orderBy: [
      {
        recurso: "asc",
      },
      {
        acao: "asc",
      },
      {
        escopo: "asc",
      },
    ],
  });
}

export async function buscarPerfilPorId(id: string) {
  return prisma.perfil.findUnique({
    where: {
      id,
    },
    include: {
      permissoes: {
        include: {
          permissao: true,
        },
      },
      usuarios: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function codigoPerfilExiste(codigo: string, ignorarId?: string) {
  const perfil = await prisma.perfil.findUnique({
    where: {
      codigo,
    },
  });

  if (!perfil) {
    return false;
  }

  if (ignorarId && perfil.id === ignorarId) {
    return false;
  }

  return true;
}