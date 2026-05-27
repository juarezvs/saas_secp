import { prisma } from "@/shared/infrastructure/database/prisma";

export type ChefiaResolvida = {
  unidadeOrigemId: string;
  unidadeResponsavelId: string;
  gestorUnidadeId: string;
  servidorId: string;
  usuarioId: string;
  matricula: string;
  nome: string;
  papel: string;
  herdada: boolean;
};

export async function resolverChefiaResponsavelDaUnidade(
  unidadeId: string
): Promise<ChefiaResolvida | null> {
  const unidade = await prisma.unidadeOrganizacional.findUnique({
    where: {
      id: unidadeId,
    },
    select: {
      id: true,
      unidadePaiId: true,
    },
  });

  if (!unidade) {
    return null;
  }

  const gestorTitular = await prisma.gestorUnidade.findFirst({
    where: {
      unidadeId,
      papel: "GESTOR_TITULAR",
      ativo: true,
      dataFim: null,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  if (gestorTitular) {
    return {
      unidadeOrigemId: unidadeId,
      unidadeResponsavelId: unidadeId,
      gestorUnidadeId: gestorTitular.id,
      servidorId: gestorTitular.servidorId,
      usuarioId: gestorTitular.servidor.usuarioId,
      matricula: gestorTitular.servidor.matricula,
      nome: gestorTitular.servidor.usuario.nome,
      papel: gestorTitular.papel,
      herdada: false,
    };
  }

  if (!unidade.unidadePaiId) {
    return null;
  }

  const chefiaSuperior = await resolverChefiaResponsavelDaUnidade(
    unidade.unidadePaiId
  );

  if (!chefiaSuperior) {
    return null;
  }

  return {
    ...chefiaSuperior,
    unidadeOrigemId: unidadeId,
    herdada: true,
  };
}

export async function listarDelegadosAtivosDaUnidade(unidadeId: string) {
  return prisma.gestorUnidade.findMany({
    where: {
      unidadeId,
      papel: "DELEGADO_CHEFIA",
      ativo: true,
      dataFim: null,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
}