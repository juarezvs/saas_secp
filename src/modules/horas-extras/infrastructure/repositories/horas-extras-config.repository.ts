import { prisma } from "@/shared/infrastructure/database/prisma";

type ListarConfiguracaoHorasExtrasParams = {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
};

function filtroOrgao(params: ListarConfiguracaoHorasExtrasParams) {
  if (params.escopoGlobal) {
    return {};
  }

  return {
    orgaoId: {
      in: params.orgaoIds ?? [],
    },
  };
}

export async function listarConfiguracaoHorasExtras(
  params: ListarConfiguracaoHorasExtrasParams,
) {
  const whereOrgao = filtroOrgao(params);

  const [policies, workflows] = await Promise.all([
    prisma.overtimePolicy.findMany({
      where: {
        ...whereOrgao,
        active: true,
      },
      include: {
        orgao: true,
        scopeUnit: true,
        versions: {
          where: {
            active: true,
          },
          include: {
            rateRules: {
              where: {
                active: true,
              },
              orderBy: {
                dayType: "asc",
              },
            },
          },
          orderBy: {
            version: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.overtimeWorkflowDefinition.findMany({
      where: {
        ...whereOrgao,
        active: true,
      },
      include: {
        orgao: true,
        scopeUnit: true,
        versions: {
          where: {
            active: true,
          },
          include: {
            steps: {
              orderBy: {
                order: "asc",
              },
            },
            transitions: {
              orderBy: [{ fromStepCode: "asc" }, { actionCode: "asc" }],
            },
          },
          orderBy: {
            version: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    policies,
    workflows,
  };
}

export async function listarUnidadesParaConfiguracaoHorasExtras(
  params: ListarConfiguracaoHorasExtrasParams,
) {
  const whereOrgao = filtroOrgao(params);

  return prisma.unidadeOrganizacional.findMany({
    where: {
      ...whereOrgao,
      ativo: true,
    },
    select: {
      id: true,
      orgaoId: true,
      sigla: true,
      nome: true,
      tipo: true,
      unidadePaiId: true,
      orgao: {
        select: {
          sigla: true,
        },
      },
    },
    orderBy: [{ orgao: { sigla: "asc" } }, { sigla: "asc" }],
  });
}
