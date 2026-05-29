import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarOrgaosAtivos() {
  return prisma.orgao.findMany({
    where: {
      ativo: true,
    },

    orderBy: [
      {
        sigla: "asc",
      },
    ],

    select: {
      id: true,
      sigla: true,
      nome: true,
    },
  });
}

export async function listarOrgaos() {
  return prisma.orgao.findMany({
    orderBy: [
      {
        sigla: "asc",
      },
    ],

    select: {
      id: true,
      sigla: true,
      nome: true,
      ativo: true,
    },
  });
}

export async function buscarOrgaoPorId(id: string) {
  return prisma.orgao.findUnique({
    where: {
      id,
    },
  });
}

export async function existeOrgaoComSigla(sigla: string, ignorarId?: string) {
  const orgao = await prisma.orgao.findFirst({
    where: {
      sigla,

      ...(ignorarId
        ? {
            id: {
              not: ignorarId,
            },
          }
        : {}),
    },

    select: {
      id: true,
    },
  });

  return Boolean(orgao);
}
