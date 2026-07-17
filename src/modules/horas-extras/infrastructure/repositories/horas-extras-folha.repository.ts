import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarOrgaosParaLoteHorasExtras(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
}) {
  return prisma.orgao.findMany({
    where: {
      ativo: true,
      ...(params.escopoGlobal
        ? {}
        : {
            id: {
              in: params.orgaoIds ?? [],
            },
          }),
    },
    orderBy: {
      sigla: "asc",
    },
  });
}

export async function listarLotesFolhaHorasExtras(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
  limite?: number;
}) {
  return prisma.overtimePayrollBatch.findMany({
    where: {
      ...(params.escopoGlobal
        ? {}
        : {
            orgaoId: {
              in: params.orgaoIds ?? [],
            },
          }),
    },
    include: {
      employees: {
        orderBy: {
          employeeName: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params.limite ?? 50,
  });
}

export async function buscarLoteFolhaHorasExtrasPorId(id: string) {
  return prisma.overtimePayrollBatch.findUnique({
    where: {
      id,
    },
    include: {
      employees: {
        orderBy: {
          employeeName: "asc",
        },
        include: {
          lines: {
            orderBy: {
              date: "asc",
            },
          },
        },
      },
      lines: {
        orderBy: {
          date: "asc",
        },
      },
    },
  });
}
