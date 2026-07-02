import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarPerfisParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  codigo?: string;
  nome?: string;
  permissao?: string;
  status?: string;
  orgaoIdsPermitidos?: string[];
};

export function montarWherePerfis(params: ListarPerfisParams) {
  const busca = params.busca?.trim();

  return {
    ...(params.orgaoIdsPermitidos
      ? {
          usuarios: {
            some: {
              OR: [
                { orgaoId: { in: params.orgaoIdsPermitidos } },
                {
                  usuario: {
                    servidor: {
                      orgaoId: { in: params.orgaoIdsPermitidos },
                    },
                  },
                },
              ],
            },
          },
        }
      : {}),
    ...(params.status === "ativo"
      ? { ativo: true }
      : params.status === "inativo"
        ? { ativo: false }
        : {}),

    ...(params.codigo
      ? {
          codigo: {
            contains: params.codigo,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(params.nome
      ? {
          nome: {
            contains: params.nome,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(params.permissao
      ? {
          permissoes: {
            some: {
              permissao: {
                OR: [
                  {
                    codigo: {
                      contains: params.permissao,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    descricao: {
                      contains: params.permissao,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        }
      : {}),

    ...(busca
      ? {
          OR: [
            { codigo: { contains: busca, mode: "insensitive" as const } },
            { nome: { contains: busca, mode: "insensitive" as const } },
            { descricao: { contains: busca, mode: "insensitive" as const } },
            {
              permissoes: {
                some: {
                  permissao: {
                    OR: [
                      {
                        codigo: {
                          contains: busca,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        recurso: {
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
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function includePerfilListagem(params?: { orgaoIdsPermitidos?: string[] }) {
  const filtroUsuario = params?.orgaoIdsPermitidos
    ? {
        OR: [
          { orgaoId: { in: params.orgaoIdsPermitidos } },
          {
            usuario: {
              servidor: {
                orgaoId: { in: params.orgaoIdsPermitidos },
              },
            },
          },
        ],
      }
    : undefined;

  return {
    permissoes: {
      include: {
        permissao: true,
      },
    },
    _count: {
      select: {
        usuarios: filtroUsuario ? { where: filtroUsuario } : true,
      },
    },
  };
}

export async function listarPerfisPaginado(params: ListarPerfisParams) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWherePerfis(params);

  const [total, perfis] = await Promise.all([
    prisma.perfil.count({ where }),
    prisma.perfil.findMany({
      where,
      orderBy: [{ nome: "asc" }, { codigo: "asc" }],
      include: includePerfilListagem(params),
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    perfis,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarPerfisParaExportacao(params: ListarPerfisParams) {
  return prisma.perfil.findMany({
    where: montarWherePerfis(params),
    orderBy: [{ nome: "asc" }, { codigo: "asc" }],
    include: includePerfilListagem(params),
  });
}

export async function listarPerfisParaFiltro(params: {
  orgaoIdsPermitidos?: string[];
} = {}) {
  return prisma.perfil.findMany({
    where: montarWherePerfis({
      orgaoIdsPermitidos: params.orgaoIdsPermitidos,
      status: "ativo",
    }),
    select: {
      id: true,
      codigo: true,
      nome: true,
    },
    orderBy: [{ nome: "asc" }, { codigo: "asc" }],
  });
}

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

export async function listarPermissoesParaFiltro() {
  return prisma.permissao.findMany({
    select: {
      id: true,
      codigo: true,
      recurso: true,
      acao: true,
      escopo: true,
      descricao: true,
    },
    orderBy: [
      { recurso: "asc" },
      { acao: "asc" },
      { escopo: "asc" },
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
