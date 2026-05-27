import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarOrgaosAtivos() {
  return prisma.orgao.findMany({
    where: {
      ativo: true,
    },
    orderBy: {
      sigla: "asc",
    },
  });
}

export async function listarUnidadesParaSelecao() {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    orderBy: [
      {
        sigla: "asc",
      },
      {
        nome: "asc",
      },
    ],
    select: {
      id: true,
      orgaoId: true,
      codigo: true,
      sigla: true,
      nome: true,
      tipo: true,
      unidadePaiId: true,
    },
  });
}

export async function listarUnidadesOrganizacionais() {
  return prisma.unidadeOrganizacional.findMany({
    orderBy: [
      {
        sigla: "asc",
      },
      {
        nome: "asc",
      },
    ],
    include: {
      orgao: true,
      unidadePai: true,
      _count: {
        select: {
          unidadesFilhas: true,
          lotacoes: true,
          gestores: true,
        },
      },
    },
  });
}

export async function buscarUnidadePorId(id: string) {
  return prisma.unidadeOrganizacional.findUnique({
    where: {
      id,
    },
    include: {
      orgao: true,
      unidadePai: true,
      unidadesFilhas: {
        orderBy: [
          {
            sigla: "asc",
          },
          {
            nome: "asc",
          },
        ],
      },
      lotacoes: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      gestores: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
      },
      _count: {
        select: {
          unidadesFilhas: true,
          lotacoes: true,
          gestores: true,
        },
      },
    },
  });
}

export async function codigoUnidadeExiste(
  orgaoId: string,
  codigo: string,
  ignorarId?: string
) {
  const unidade = await prisma.unidadeOrganizacional.findUnique({
    where: {
      orgaoId_codigo: {
        orgaoId,
        codigo,
      },
    },
  });

  if (!unidade) {
    return false;
  }

  if (ignorarId && unidade.id === ignorarId) {
    return false;
  }

  return true;
}

export async function listarIdsDescendentesDaUnidade(
  unidadeId: string
): Promise<string[]> {
  const filhas = await prisma.unidadeOrganizacional.findMany({
    where: {
      unidadePaiId: unidadeId,
    },
    select: {
      id: true,
    },
  });

  const idsDiretos = filhas.map((filha) => filha.id);

  const idsIndiretos = await Promise.all(
    idsDiretos.map((id) => listarIdsDescendentesDaUnidade(id))
  );

  return [...idsDiretos, ...idsIndiretos.flat()];
}