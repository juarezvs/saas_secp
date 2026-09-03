import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

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

type ResolverChefiaOptions = {
  dataReferencia?: Date;
  ignorarServidorId?: string | null;
};

const papeisResponsaveis = [
  "GESTOR_TITULAR",
  "GESTOR_SUBSTITUTO",
  "DELEGADO_CHEFIA",
] as const;

const prioridadePapel = new Map<string, number>(
  papeisResponsaveis.map((papel, index) => [papel, index]),
);

function ordenarGestoresPorPrioridade<
  T extends { papel: string; dataInicio: Date },
>(gestores: T[]) {
  return gestores.sort((a, b) => {
    const prioridadeA = prioridadePapel.get(a.papel) ?? 99;
    const prioridadeB = prioridadePapel.get(b.papel) ?? 99;

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return b.dataInicio.getTime() - a.dataInicio.getTime();
  });
}

function montarChefiaResolvida(params: {
  unidadeOrigemId: string;
  unidadeResponsavelId: string;
  gestor: Awaited<ReturnType<typeof buscarGestoresResponsaveisAtuais>>[number];
  herdada: boolean;
}): ChefiaResolvida {
  return {
    unidadeOrigemId: params.unidadeOrigemId,
    unidadeResponsavelId: params.unidadeResponsavelId,
    gestorUnidadeId: params.gestor.id,
    servidorId: params.gestor.servidorId,
    usuarioId: params.gestor.servidor.usuarioId,
    matricula: params.gestor.servidor.matricula,
    nome: nomeServidor(params.gestor.servidor),
    papel: params.gestor.papel,
    herdada: params.herdada,
  };
}

async function buscarGestoresResponsaveisAtuais(
  unidadeId: string,
  options?: ResolverChefiaOptions,
) {
  const dataReferencia = options?.dataReferencia ?? new Date();

  const gestores = await prisma.gestorUnidade.findMany({
    where: {
      unidadeId,
      papel: {
        in: [...papeisResponsaveis],
      },
      ativo: true,
      dataInicio: {
        lte: dataReferencia,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
      servidor: {
        ativo: true,
        ...(options?.ignorarServidorId
          ? { id: { not: options.ignorarServidorId } }
          : {}),
      },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });

  return ordenarGestoresPorPrioridade(gestores);
}

export async function resolverChefiaResponsavelDaUnidade(
  unidadeId: string,
  options?: ResolverChefiaOptions,
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

  const [gestorResponsavel] = await buscarGestoresResponsaveisAtuais(
    unidadeId,
    options,
  );

  if (gestorResponsavel) {
    return montarChefiaResolvida({
      unidadeOrigemId: unidadeId,
      unidadeResponsavelId: unidadeId,
      herdada: false,
      gestor: gestorResponsavel,
    });
  }

  if (!unidade.unidadePaiId) {
    return null;
  }

  const chefiaSuperior = await resolverChefiaResponsavelDaUnidade(
    unidade.unidadePaiId,
    options,
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

export async function resolverGestorUnidadePorUsuarioNaHierarquia(
  unidadeId: string,
  usuarioId: string,
) {
  let unidadeAtualId: string | null = unidadeId;
  const unidadeIds: string[] = [];

  while (unidadeAtualId) {
    unidadeIds.push(unidadeAtualId);

    const unidade: { unidadePaiId: string | null } | null =
      await prisma.unidadeOrganizacional.findUnique({
        where: { id: unidadeAtualId },
        select: { unidadePaiId: true },
      });

    unidadeAtualId = unidade?.unidadePaiId ?? null;
  }

  return prisma.gestorUnidade.findFirst({
    where: {
      unidadeId: {
        in: unidadeIds,
      },
      servidor: {
        usuarioId,
      },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
    orderBy: [
      {
        ativo: "desc",
      },
      {
        dataInicio: "desc",
      },
    ],
  });
}

export async function listarDelegadosAtivosDaUnidade(unidadeId: string) {
  const hoje = new Date();

  return prisma.gestorUnidade.findMany({
    where: {
      unidadeId,
      papel: "DELEGADO_CHEFIA",
      ativo: true,
      dataInicio: {
        lte: hoje,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
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
