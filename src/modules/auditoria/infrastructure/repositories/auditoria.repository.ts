import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarAuditoriaParams = {
  pagina?: number;
  limite?: number;
  busca?: string;
  entidade?: string;
  acao?: string;
  usuarioId?: string;
  dataInicio?: string;
  dataFim?: string;
};

function criarFiltroData(dataInicio?: string, dataFim?: string) {
  if (!dataInicio && !dataFim) {
    return undefined;
  }

  const filtro: {
    gte?: Date;
    lt?: Date;
  } = {};

  if (dataInicio) {
    filtro.gte = new Date(`${dataInicio}T00:00:00`);
  }

  if (dataFim) {
    const fim = new Date(`${dataFim}T00:00:00`);
    fim.setDate(fim.getDate() + 1);
    filtro.lt = fim;
  }

  return filtro;
}

export async function listarEventosAuditoria(params: ListarAuditoriaParams) {
  const pagina = Math.max(1, params.pagina ?? 1);
  const limite = Math.min(100, Math.max(10, params.limite ?? 20));
  const skip = (pagina - 1) * limite;

  const busca = params.busca?.trim();

  const where = {
    ...(params.entidade
      ? {
          entidade: params.entidade,
        }
      : {}),
    ...(params.acao
      ? {
          acao: {
            contains: params.acao,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(params.usuarioId
      ? {
          usuarioId: params.usuarioId,
        }
      : {}),
    ...(criarFiltroData(params.dataInicio, params.dataFim)
      ? {
          criadoEm: criarFiltroData(params.dataInicio, params.dataFim),
        }
      : {}),
    ...(busca
      ? {
          OR: [
            {
              entidade: {
                contains: busca,
                mode: "insensitive" as const,
              },
            },
            {
              entidadeId: {
                contains: busca,
                mode: "insensitive" as const,
              },
            },
            {
              acao: {
                contains: busca,
                mode: "insensitive" as const,
              },
            },
            {
              usuario: {
                nome: {
                  contains: busca,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              usuario: {
                matricula: {
                  contains: busca,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, eventos] = await Promise.all([
    prisma.auditoriaEvento.count({
      where,
    }),
    prisma.auditoriaEvento.findMany({
      where,
      include: {
        usuario: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
      skip,
      take: limite,
    }),
  ]);

  return {
    eventos,
    paginacao: {
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

export async function buscarEventoAuditoriaPorId(id: string) {
  return prisma.auditoriaEvento.findUnique({
    where: {
      id,
    },
    include: {
      usuario: true,
    },
  });
}

export async function listarUsuariosParaFiltroAuditoria() {
  return prisma.usuario.findMany({
    where: {
      auditorias: {
        some: {},
      },
    },
    orderBy: {
      nome: "asc",
    },
    select: {
      id: true,
      nome: true,
      matricula: true,
    },
  });
}

export async function listarEntidadesAuditoria() {
  const entidades = await prisma.auditoriaEvento.findMany({
    distinct: ["entidade"],
    select: {
      entidade: true,
    },
    orderBy: {
      entidade: "asc",
    },
  });

  return entidades.map((item) => item.entidade);
}
