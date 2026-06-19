import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarServidoresParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  matricula?: string;
  cpf?: string;
  nome?: string;
  orgaoId?: string;
  vinculo?: string;
  lotacao?: string;
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

export function montarWhereServidores(params: ListarServidoresParams) {
  const busca = params.busca?.trim();
  const orgaoId = params.orgaoId?.trim();

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

    ...(params.cpf ? { cpf: { contains: params.cpf } } : {}),

    ...(params.nome
      ? {
          OR: [
            {
              nomeFuncional: {
                contains: params.nome,
                mode: "insensitive" as const,
              },
            },
            {
              usuario: {
                nome: { contains: params.nome, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),

    ...(orgaoId && ehUuid(orgaoId) ? { orgaoId } : {}),

    ...(params.vinculo ? { vinculo: params.vinculo as never } : {}),

    ...(params.lotacao
      ? {
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
        }
      : {}),

    ...(busca
      ? {
          OR: [
            { matricula: { contains: busca, mode: "insensitive" as const } },
            { cpf: { contains: busca } },
            {
              nomeFuncional: {
                contains: busca,
                mode: "insensitive" as const,
              },
            },
            {
              usuario: {
                nome: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              usuario: {
                email: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
              orgao: {
                sigla: { contains: busca, mode: "insensitive" as const },
              },
            },
            {
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
                        nome: { contains: busca, mode: "insensitive" as const },
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

export async function listarServidoresPaginado(params: ListarServidoresParams) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereServidores(params);

  const [total, servidores] = await Promise.all([
    prisma.servidor.count({ where }),
    prisma.servidor.findMany({
      where,
      include: {
        usuario: true,
        orgao: true,
        lotacoes: {
          where: { status: "ATIVO" },
          include: { unidade: true },
          orderBy: { dataInicio: "desc" },
          take: 1,
        },
        _count: { select: { lotacoes: true, gestores: true } },
      },
      orderBy: [{ nomeFuncional: "asc" }, { usuario: { nome: "asc" } }, { matricula: "asc" }],
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    servidores,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarServidoresParaExportacao(
  params: ListarServidoresParams,
) {
  return prisma.servidor.findMany({
    where: montarWhereServidores(params),
    include: {
      usuario: true,
      orgao: true,
      lotacoes: {
        where: { status: "ATIVO" },
        include: { unidade: true },
        orderBy: { dataInicio: "desc" },
        take: 1,
      },
    },
    orderBy: [{ nomeFuncional: "asc" }, { usuario: { nome: "asc" } }, { matricula: "asc" }],
  });
}

export async function buscarServidorPorId(id: string) {
  if (!ehUuid(id)) {
    return null;
  }

  return prisma.servidor.findUnique({
    where: {
      id,
    },
    include: {
      usuario: {
        include: {
          perfis: {
            include: {
              perfil: true,
            },
          },
        },
      },
      orgao: true,
      lotacoes: {
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      gestores: {
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
      dispensasPonto: {
        orderBy: [
          {
            status: "asc",
          },
          {
            dataInicio: "desc",
          },
        ],
      },
    },
  });
}

export async function buscarNomeServidorPorUsuarioId(usuarioId: string) {
  if (!ehUuid(usuarioId)) {
    return null;
  }

  return prisma.servidor.findUnique({
    where: {
      usuarioId,
    },
    select: {
      nomeFuncional: true,
      usuario: {
        select: {
          nome: true,
        },
      },
    },
  });
}

export async function listarUnidadesAtivasParaLotacao() {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
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
    },
  });
}

export async function listarOrgaosAtivosParaServidor() {
  return prisma.orgao.findMany({
    where: {
      ativo: true,
    },
    orderBy: {
      sigla: "asc",
    },
  });
}

export async function usuarioMatriculaExiste(
  matricula: string,
  ignorarUsuarioId?: string,
) {
  const valor = matricula?.trim();

  if (!valor) {
    return false;
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      matricula: valor,
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

export async function matriculaServidorExiste(
  matricula: string,
  ignorarServidorId?: string,
) {
  const valor = matricula?.trim();

  if (!valor) {
    return false;
  }

  const servidor = await prisma.servidor.findUnique({
    where: {
      matricula: valor,
    },
  });

  if (!servidor) {
    return false;
  }

  if (ignorarServidorId && servidor.id === ignorarServidorId) {
    return false;
  }

  return true;
}

export async function cpfServidorExiste(
  cpf: string,
  ignorarServidorId?: string,
): Promise<boolean> {
  const valorOriginal = cpf?.trim();
  const valorSomenteDigitos = valorOriginal?.replace(/\D/g, "");

  if (!valorSomenteDigitos) {
    return false;
  }

  const whereExclusao =
    ignorarServidorId && ehUuid(ignorarServidorId)
      ? {
          id: {
            not: ignorarServidorId,
          },
        }
      : {};

  try {
    const registro = await prisma.servidor.findFirst({
      where: {
        ...whereExclusao,
        OR: [
          {
            cpf: {
              equals: valorSomenteDigitos,
            },
          },
          {
            cpf: {
              equals: valorOriginal,
            },
          },
        ],
      } as never,
      select: {
        id: true,
      },
    });

    return Boolean(registro);
  } catch {
    const cpfNumerico = Number(valorSomenteDigitos);

    if (!Number.isFinite(cpfNumerico)) {
      return false;
    }

    const registro = await prisma.servidor.findFirst({
      where: {
        ...whereExclusao,
        cpf: {
          equals: cpfNumerico,
        },
      } as never,
      select: {
        id: true,
      },
    });

    return Boolean(registro);
  }
}
