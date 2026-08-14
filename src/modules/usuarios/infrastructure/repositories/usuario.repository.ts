import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarUsuariosParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  matricula?: string;
  nome?: string;
  email?: string;
  tipo?: string;
  lotacao?: string;
  perfil?: string;
  orgaoId?: string;
  orgaoIdsPermitidos?: string[];
  incluirUsuariosSistemaSemEscopo?: boolean;
  status?: string;
};

function ehUuid(valor?: string | null): valor is string {
  if (!valor) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function ehTipoUsuario(valor?: string | null) {
  return [
    "SERVIDOR",
    "SISTEMA",
    "PESSOA_EXTERNA",
    "PRESTADOR",
    "ESTAGIARIO",
    "VOLUNTARIO",
  ].includes(valor ?? "");
}

function normalizarTipoUsuario(valor?: string | null) {
  const tipo = valor?.trim().toUpperCase();

  if (tipo === "SISTEMAS") {
    return "SISTEMA";
  }

  return tipo;
}

export function montarWhereUsuarios(params: ListarUsuariosParams) {
  const busca = params.busca?.trim();
  const tipo = normalizarTipoUsuario(params.tipo);
  const orgaoId = params.orgaoId?.trim();
  const orgaoIdsPermitidos = params.orgaoIdsPermitidos?.filter(ehUuid);
  const whereEscopoOrgao =
    orgaoId && ehUuid(orgaoId)
      ? [
          { servidor: { orgaoId } },
          { perfis: { some: { orgaoId } } },
        ]
      : orgaoIdsPermitidos?.length
        ? [
            { servidor: { orgaoId: { in: orgaoIdsPermitidos } } },
            { perfis: { some: { orgaoId: { in: orgaoIdsPermitidos } } } },
          ]
        : [];
  const whereUsuariosSistemaSemEscopo = params.incluirUsuariosSistemaSemEscopo
    ? [
        {
          tipo: "SISTEMA" as const,
          servidor: null,
          perfis: {
            none: {},
          },
        },
      ]
    : [];
  const whereRestricaoEscopo = [
    ...whereEscopoOrgao,
    ...whereUsuariosSistemaSemEscopo,
  ];

  const where = {
    ...(params.status === "ativo"
      ? { ativo: true }
      : params.status === "inativo"
        ? { ativo: false }
        : {}),

    ...(params.matricula
      ? {
          matricula: {
            contains: params.matricula,
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

    ...(params.email
      ? {
          email: {
            contains: params.email,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(tipo && ehTipoUsuario(tipo) ? { tipo: tipo as never } : {}),

    ...(params.lotacao
      ? {
          servidor: {
            lotacoes: {
              some: {
                status: "ATIVO" as const,
                unidade: {
                  OR: [
                    {
                      sigla: {
                        contains: params.lotacao,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      nome: {
                        contains: params.lotacao,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
          },
        }
      : {}),

    ...(params.perfil
      ? {
          perfis: {
            some: {
              perfil: {
                OR: [
                  {
                    codigo: {
                      contains: params.perfil,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    nome: {
                      contains: params.perfil,
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
            { matricula: { contains: busca, mode: "insensitive" as const } },
            { cpf: { contains: busca } },
            { nome: { contains: busca, mode: "insensitive" as const } },
            { email: { contains: busca, mode: "insensitive" as const } },
            {
              servidor: {
                lotacoes: {
                  some: {
                    status: "ATIVO" as const,
                    unidade: {
                      OR: [
                        {
                          sigla: {
                            contains: busca,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          nome: {
                            contains: busca,
                            mode: "insensitive" as const,
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              perfis: {
                some: {
                  perfil: {
                    OR: [
                      {
                        codigo: {
                          contains: busca,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        nome: {
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

  return whereRestricaoEscopo.length
    ? { AND: [where, { OR: whereRestricaoEscopo }] }
    : where;
}

const includeUsuarioListagem = {
  servidor: {
    include: {
      lotacoes: {
        where: {
          status: "ATIVO" as const,
        },
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc" as const,
        },
        take: 1,
      },
    },
  },
  perfis: {
    include: {
      orgao: true,
      perfil: true,
    },
    orderBy: {
      criadoEm: "desc" as const,
    },
  },
};

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      servidor: {
        include: {
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
      perfis: {
        include: {
          perfil: true,
        },
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });
}

export async function listarUsuariosPaginado(params: ListarUsuariosParams) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereUsuarios(params);

  const [total, usuarios] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      orderBy: [{ nome: "asc" }, { matricula: "asc" }],
      include: includeUsuarioListagem,
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    usuarios,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarUsuariosParaExportacao(
  params: ListarUsuariosParams,
) {
  return prisma.usuario.findMany({
    where: montarWhereUsuarios(params),
    orderBy: [{ nome: "asc" }, { matricula: "asc" }],
    include: includeUsuarioListagem,
  });
}

export async function buscarUsuarioPorId(id: string) {
  return prisma.usuario.findUnique({
    where: {
      id,
    },
    include: {
      servidor: {
        include: {
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
          },
          jornadas: {
            include: {
              jornada: true,
              escala: true,
            },
            orderBy: {
              dataInicio: "desc",
            },
          },
        },
      },
      perfis: {
        include: {
          orgao: true,
          perfil: {
            include: {
              permissoes: {
                include: {
                  permissao: true,
                },
              },
            },
          },
        },
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });
}

export async function listarPerfisAtivosParaUsuario(params: {
  orgaoIdsPermitidos?: string[];
} = {}) {
  return prisma.perfil.findMany({
    where: {
      ativo: true,
      ...(params.orgaoIdsPermitidos
        ? {
            OR: [
              { orgaoId: null },
              { orgaoId: { in: params.orgaoIdsPermitidos } },
            ],
          }
        : {}),
    },
    orderBy: {
      nome: "asc",
    },
    include: {
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
    },
  });
}

export async function matriculaUsuarioExiste(
  matricula: string,
  ignorarUsuarioId?: string,
) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      matricula,
    },
  });

  if (!usuario) {
    return false;
  }

  if (ignorarUsuarioId && usuario.id === ignorarUsuarioId) {
    return false;
  }

  return true;
}

export async function emailUsuarioExiste(
  email: string,
  ignorarUsuarioId?: string,
) {
  if (!email) {
    return false;
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      email,
    },
  });

  if (!usuario) {
    return false;
  }

  if (ignorarUsuarioId && usuario.id === ignorarUsuarioId) {
    return false;
  }

  return true;
}

export async function buscarUsuarioPerfil(params: {
  usuarioId: string;
  perfilId: string;
  orgaoId?: string | null;
}) {
  return prisma.usuarioPerfil.findFirst({
    where: {
      usuarioId: params.usuarioId,
      perfilId: params.perfilId,
      orgaoId: params.orgaoId ?? null,
    },
  });
}
