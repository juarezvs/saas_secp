import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

const papeisResponsaveis = [
  "GESTOR_TITULAR",
  "GESTOR_SUBSTITUTO",
  "DELEGADO_CHEFIA",
] as const;

const prioridadePapel = new Map<string, number>(
  papeisResponsaveis.map((papel, index) => [papel, index]),
);

type GestorResponsavelListagem = {
  id: string;
  unidadeId: string;
  servidorId: string;
  papel: string;
  dataInicio: Date;
  servidor: {
    usuarioId: string;
    matricula: string;
    nomeFuncional: string | null;
    usuario: {
      nome: string;
    };
  };
};

type ChefiaResolvidaListagem = {
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

function ordenarGestoresPorPrioridade<T extends { papel: string; dataInicio: Date }>(
  gestores: T[],
) {
  return [...gestores].sort((a, b) => {
    const prioridadeA = prioridadePapel.get(a.papel) ?? 99;
    const prioridadeB = prioridadePapel.get(b.papel) ?? 99;

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return b.dataInicio.getTime() - a.dataInicio.getTime();
  });
}

function montarChefiaResolvidaListagem(params: {
  unidadeOrigemId: string;
  unidadeResponsavelId: string;
  gestor: GestorResponsavelListagem;
  herdada: boolean;
}): ChefiaResolvidaListagem {
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

export async function listarServidoresAtivosParaGestao(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      ...(params?.orgaoIdsPermitidos
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : {}),
      usuario: {
        ativo: true,
      },
    },
    orderBy: {
      matricula: "asc",
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });
}

export async function listarUnidadesAtivasParaGestao(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
      ...(params?.orgaoIdsPermitidos
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : {}),
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
      sigla: true,
      nome: true,
      tipo: true,
      unidadePaiId: true,
    },
  });
}

export async function buscarUnidadeComGestores(unidadeId: string) {
  return prisma.unidadeOrganizacional.findUnique({
    where: {
      id: unidadeId,
    },
    include: {
      orgao: true,
      unidadePai: true,
      gestores: {
        orderBy: [
          {
            ativo: "desc",
          },
          {
            dataInicio: "desc",
          },
        ],
        include: {
          servidor: {
            include: {
              usuario: true,
              lotacoes: {
                where: {
                  status: "ATIVO",
                },
                include: {
                  unidade: true,
                },
                orderBy: {
                  dataInicio: "desc",
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listarUnidadesComGestores(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  const hoje = new Date();
  const unidades = await prisma.unidadeOrganizacional.findMany({
    where: {
      ...(params?.orgaoIdsPermitidos
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : {}),
    },
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
      gestores: {
        where: {
          ativo: true,
          dataInicio: {
            lte: hoje,
          },
          OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
          papel: {
            in: [...papeisResponsaveis],
          },
          servidor: {
            ativo: true,
          },
        },
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
        },
        orderBy: {
          papel: "asc",
        },
      },
      _count: {
        select: {
          lotacoes: {
            where: {
              status: "ATIVO",
            },
          },
          unidadesFilhas: true,
        },
      },
    },
  });

  const unidadesPorId = new Map(
    unidades.map((unidade) => [unidade.id, unidade]),
  );
  const chefiasResolvidasPorUnidade = new Map<
    string,
    ChefiaResolvidaListagem | null
  >();

  function resolverChefiaBase(
    unidadeId: string,
    visitadas = new Set<string>(),
  ): ChefiaResolvidaListagem | null {
    if (chefiasResolvidasPorUnidade.has(unidadeId)) {
      return chefiasResolvidasPorUnidade.get(unidadeId) ?? null;
    }

    if (visitadas.has(unidadeId)) {
      return null;
    }

    const unidade = unidadesPorId.get(unidadeId);

    if (!unidade) {
      return null;
    }

    visitadas.add(unidadeId);

    const [gestorResponsavel] = ordenarGestoresPorPrioridade(
      unidade.gestores as GestorResponsavelListagem[],
    );

    if (gestorResponsavel) {
      const chefia = montarChefiaResolvidaListagem({
        unidadeOrigemId: unidadeId,
        unidadeResponsavelId: unidadeId,
        gestor: gestorResponsavel,
        herdada: false,
      });

      chefiasResolvidasPorUnidade.set(unidadeId, chefia);

      return chefia;
    }

    const chefiaSuperior = unidade.unidadePaiId
      ? resolverChefiaBase(unidade.unidadePaiId, visitadas)
      : null;

    const chefia = chefiaSuperior
      ? {
          ...chefiaSuperior,
          unidadeOrigemId: unidadeId,
          herdada: true,
        }
      : null;

    chefiasResolvidasPorUnidade.set(unidadeId, chefia);

    return chefia;
  }

  return unidades.map((unidade) => ({
    ...unidade,
    chefiaResolvida: resolverChefiaBase(unidade.id),
  }));
}

export async function buscarGestorUnidadePorId(gestorUnidadeId: string) {
  return prisma.gestorUnidade.findUnique({
    where: {
      id: gestorUnidadeId,
    },
    include: {
      unidade: true,
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function existeGestorAtivoComMesmoPapel(params: {
  unidadeId: string;
  papel: string;
  ignorarGestorUnidadeId?: string;
}) {
  const gestor = await prisma.gestorUnidade.findFirst({
    where: {
      unidadeId: params.unidadeId,
      papel: params.papel as never,
      ativo: true,
      dataFim: null,
      id: params.ignorarGestorUnidadeId
        ? {
            not: params.ignorarGestorUnidadeId,
          }
        : undefined,
    },
  });

  return Boolean(gestor);
}
