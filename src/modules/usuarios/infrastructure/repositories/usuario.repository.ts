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
  status?: string;
};

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

export function montarWhereUsuarios(params: ListarUsuariosParams) {
  const busca = params.busca?.trim();
  const tipo = params.tipo?.trim();

  return {
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

export async function listarPerfisAtivosParaUsuario() {
  return prisma.perfil.findMany({
    where: {
      ativo: true,
    },
    orderBy: {
      nome: "asc",
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
}) {
  return prisma.usuarioPerfil.findFirst({
    where: {
      usuarioId: params.usuarioId,
      perfilId: params.perfilId,
    },
  });
}
