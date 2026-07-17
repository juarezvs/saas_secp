import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";

export async function buscarServidorSolicitanteHorasExtras(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    include: {
      usuario: true,
      orgao: true,
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
        take: 1,
      },
    },
  });
}

export async function buscarConfiguracaoAtivaHorasExtras(params: {
  orgaoId: string;
  dataReferencia: Date;
  scopeUnitId?: string | null;
}) {
  const scopeUnitIds = await listarEscoposUnidade(params.scopeUnitId);
  const scopeOr = [
    ...scopeUnitIds.map((scopeUnitId) => ({ scopeUnitId })),
    { scopeUnitId: null },
  ];

  const [policyVersions, workflowVersions] = await Promise.all([
    prisma.overtimePolicyVersion.findMany({
      where: {
        orgaoId: params.orgaoId,
        active: true,
        OR: scopeOr,
        validFrom: {
          lte: params.dataReferencia,
        },
        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: params.dataReferencia,
                },
              },
            ],
          },
        ],
        policy: {
          active: true,
        },
      },
      include: {
        policy: true,
        rateRules: {
          where: {
            active: true,
          },
        },
      },
      orderBy: {
        version: "desc",
      },
    }),
    prisma.overtimeWorkflowVersion.findMany({
      where: {
        orgaoId: params.orgaoId,
        active: true,
        OR: scopeOr,
        validFrom: {
          lte: params.dataReferencia,
        },
        AND: [
          {
            OR: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  gte: params.dataReferencia,
                },
              },
            ],
          },
        ],
        definition: {
          active: true,
        },
      },
      include: {
        definition: true,
        steps: {
          orderBy: {
            order: "asc",
          },
        },
        transitions: true,
      },
      orderBy: {
        version: "desc",
      },
    }),
  ]);

  return {
    policyVersion: escolherConfiguracaoMaisEspecifica(
      policyVersions,
      scopeUnitIds,
    ),
    workflowVersion: escolherConfiguracaoMaisEspecifica(
      workflowVersions,
      scopeUnitIds,
    ),
  };
}

async function listarEscoposUnidade(scopeUnitId?: string | null) {
  if (!scopeUnitId) {
    return [];
  }

  const escopos: string[] = [];
  const visitados = new Set<string>();
  let unidadeId: string | null = scopeUnitId;

  while (unidadeId && !visitados.has(unidadeId)) {
    visitados.add(unidadeId);
    escopos.push(unidadeId);

    const unidade: { unidadePaiId: string | null } | null =
      await prisma.unidadeOrganizacional.findUnique({
      where: {
        id: unidadeId,
      },
      select: {
        unidadePaiId: true,
      },
      });

    unidadeId = unidade?.unidadePaiId ?? null;
  }

  return escopos;
}

export function escolherConfiguracaoMaisEspecifica<T extends { scopeUnitId: string | null; version: number }>(
  versoes: T[],
  scopeUnitIds: string[],
) {
  const ordemEscopo = new Map(
    scopeUnitIds.map((scopeUnitId, index) => [scopeUnitId, index]),
  );

  return (
    [...versoes].sort((a, b) => {
      const prioridadeA =
        a.scopeUnitId === null ? Number.MAX_SAFE_INTEGER : ordemEscopo.get(a.scopeUnitId) ?? 9999;
      const prioridadeB =
        b.scopeUnitId === null ? Number.MAX_SAFE_INTEGER : ordemEscopo.get(b.scopeUnitId) ?? 9999;

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      return b.version - a.version;
    })[0] ?? null
  );
}

export async function listarSolicitacoesHorasExtras(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  usuarioId?: string;
  limite?: number;
}) {
  return prisma.overtimeRequest.findMany({
    where: {
      ...(params.escopoGlobal
        ? {}
        : params.orgaoIds
          ? {
              orgaoId: {
                in: params.orgaoIds,
              },
            }
          : {}),
      ...(params.usuarioId
        ? {
            requesterUserId: params.usuarioId,
          }
        : {}),
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      policyVersion: {
        include: {
          policy: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params.limite ?? 20,
  });
}

export async function buscarRascunhoHorasExtrasDoUsuario(params: {
  requestId: string;
  usuarioId: string;
}) {
  return prisma.overtimeRequest.findFirst({
    where: {
      id: params.requestId,
      requesterUserId: params.usuarioId,
      currentLifecycleStatus: "DRAFT",
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
    },
  });
}

export async function listarSolicitacoesHorasExtrasParaChefia(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  usuarioId?: string | null;
  limite?: number;
}) {
  const unidadesSubordinadas =
    !params.escopoGlobal && params.usuarioId
      ? await listarIdsUnidadesSubordinadasPorUsuario(params.usuarioId)
      : null;

  if (unidadesSubordinadas && unidadesSubordinadas.length === 0) {
    return [];
  }

  return prisma.overtimeRequest.findMany({
    where: {
      currentWorkflowStepCode: "ANALISE_CHEFIA",
      currentLifecycleStatus: "SUBMITTED",
      ...(params.escopoGlobal
        ? {}
        : {
            orgaoId: {
              in: params.orgaoIds ?? [],
            },
            ...(unidadesSubordinadas
              ? {
                  organizationalUnitId: {
                    in: unidadesSubordinadas,
                  },
                }
              : {}),
          }),
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      policyVersion: {
        include: {
          policy: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
        },
      },
      history: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
    take: params.limite ?? 50,
  });
}

export async function buscarSolicitacaoHorasExtrasPorId(id: string) {
  return prisma.overtimeRequest.findUnique({
    where: {
      id,
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      history: {
        orderBy: {
          createdAt: "desc",
        },
      },
      budgetReviews: {
        orderBy: {
          reviewedAt: "desc",
        },
      },
      finalDecisions: {
        orderBy: {
          decidedAt: "desc",
        },
      },
      authorizations: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          days: {
            orderBy: {
              date: "asc",
            },
          },
        },
      },
      policyVersion: {
        include: {
          policy: true,
          rateRules: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
          steps: {
            orderBy: {
              order: "asc",
            },
          },
          transitions: true,
        },
      },
    },
  });
}

export async function listarSolicitacoesHorasExtrasParaOrcamento(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  limite?: number;
}) {
  return prisma.overtimeRequest.findMany({
    where: {
      currentWorkflowStepCode: "ANALISE_ORCAMENTARIA",
      currentLifecycleStatus: "IN_WORKFLOW",
      ...(params.escopoGlobal
        ? {}
        : {
            orgaoId: {
              in: params.orgaoIds ?? [],
            },
          }),
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      policyVersion: {
        include: {
          policy: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: params.limite ?? 50,
  });
}

export async function listarSolicitacoesHorasExtrasParaDeliberacao(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  limite?: number;
}) {
  return prisma.overtimeRequest.findMany({
    where: {
      currentWorkflowStepCode: "DELIBERACAO_FINAL",
      currentLifecycleStatus: "IN_WORKFLOW",
      ...(params.escopoGlobal
        ? {}
        : {
            orgaoId: {
              in: params.orgaoIds ?? [],
            },
          }),
    },
    include: {
      days: {
        orderBy: {
          date: "asc",
        },
      },
      budgetReviews: {
        orderBy: {
          reviewedAt: "desc",
        },
        take: 1,
      },
      policyVersion: {
        include: {
          policy: true,
        },
      },
      workflowVersion: {
        include: {
          definition: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: params.limite ?? 50,
  });
}
