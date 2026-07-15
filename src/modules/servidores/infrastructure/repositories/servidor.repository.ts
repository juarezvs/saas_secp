import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarServidoresParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  matricula?: string;
  cpf?: string;
  nome?: string;
  tipoUsuario?: string;
  orgaoId?: string;
  orgaoIdsPermitidos?: string[];
  servidorIdsPermitidos?: string[];
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

function ehTipoUsuario(
  valor?: string | null,
): valor is "SERVIDOR" | "ESTAGIARIO" | "PRESTADOR" | "VOLUNTARIO" {
  return (
    valor === "SERVIDOR" ||
    valor === "ESTAGIARIO" ||
    valor === "PRESTADOR" ||
    valor === "VOLUNTARIO"
  );
}

const servidorListagemInclude = {
  usuario: true,
  orgao: true,
  cargo: true,
  lotacoes: {
    where: { status: "ATIVO" },
    include: { cargo: true, unidade: true },
    orderBy: { dataInicio: "desc" },
    take: 1,
  },
  _count: {
    select: {
      lotacoes: { where: { status: "ATIVO" } },
      gestores: true,
    },
  },
} satisfies Prisma.ServidorInclude;

const servidorExportacaoInclude = {
  usuario: true,
  orgao: true,
  cargo: true,
  lotacoes: {
    where: { status: "ATIVO" },
    include: { cargo: true, unidade: true },
    orderBy: { dataInicio: "desc" },
    take: 1,
  },
} satisfies Prisma.ServidorInclude;

export function montarWhereServidores(
  params: ListarServidoresParams,
): Prisma.ServidorWhereInput {
  const busca = params.busca?.trim();
  const orgaoId = params.orgaoId?.trim();
  const orgaoIdsPermitidos = params.orgaoIdsPermitidos?.filter(ehUuid);
  const servidorIdsPermitidos = params.servidorIdsPermitidos?.filter(ehUuid);
  const filtrarPorServidorIds = params.servidorIdsPermitidos !== undefined;

  const where: Prisma.ServidorWhereInput = {
    ...(filtrarPorServidorIds
      ? {
          id: {
            in: servidorIdsPermitidos ?? [],
          },
        }
      : {}),

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

    ...(ehTipoUsuario(params.tipoUsuario)
      ? {
          usuario: {
            tipo: params.tipoUsuario,
          },
        }
      : {}),

    ...(orgaoId && ehUuid(orgaoId)
      ? { orgaoId }
      : orgaoIdsPermitidos?.length
        ? { orgaoId: { in: orgaoIdsPermitidos } }
        : {}),

    ...(params.vinculo ? { vinculo: params.vinculo as never } : {}),

    ...(params.lotacao
      ? {
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

  return where;
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
      include: servidorListagemInclude,
      orderBy: [
        { nomeFuncional: "asc" },
        { usuario: { nome: "asc" } },
        { matricula: "asc" },
      ],
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
    include: servidorExportacaoInclude,
    orderBy: [
      { nomeFuncional: "asc" },
      { usuario: { nome: "asc" } },
      { matricula: "asc" },
    ],
  });
}

export async function listarServidoresParaFiltro(
  params: {
    orgaoIdsPermitidos?: string[];
    servidorIdsPermitidos?: string[];
    tipoUsuario?: string;
    limite?: number;
  } = {},
) {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
        ...(ehTipoUsuario(params.tipoUsuario) ? { tipo: params.tipoUsuario } : {}),
      },
      ...(params.orgaoIdsPermitidos?.length
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : {}),
      ...(params.servidorIdsPermitidos !== undefined
        ? { id: { in: params.servidorIdsPermitidos.filter(ehUuid) } }
        : {}),
    },
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      usuario: {
        select: {
          nome: true,
        },
      },
      lotacoes: {
        where: { status: "ATIVO" },
        select: {
          unidade: {
            select: {
              sigla: true,
              nome: true,
            },
          },
        },
        orderBy: { dataInicio: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { nomeFuncional: "asc" },
      { usuario: { nome: "asc" } },
      { matricula: "asc" },
    ],
    take: params.limite ?? 1000,
  });
}

export async function listarLotacoesAtivasParaFiltro(
  params: {
    orgaoIdsPermitidos?: string[];
    servidorIdsPermitidos?: string[];
    tipoUsuario?: string;
  } = {},
) {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
      lotacoes: {
        some: {
          status: "ATIVO",
          servidor: {
            ativo: true,
            usuario: {
              ativo: true,
              ...(ehTipoUsuario(params.tipoUsuario)
                ? { tipo: params.tipoUsuario }
                : {}),
            },
            ...(params.servidorIdsPermitidos !== undefined
              ? { id: { in: params.servidorIdsPermitidos.filter(ehUuid) } }
              : {}),
          },
        },
      },
      ...(params.orgaoIdsPermitidos?.length
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : {}),
    },
    select: {
      id: true,
      sigla: true,
      nome: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
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
      cargo: true,
      lotacoes: {
        where: { status: "ATIVO" },
        include: {
          cargo: true,
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

export async function listarAfastamentosServidorSarh(servidorId: string) {
  if (!ehUuid(servidorId)) {
    return [];
  }

  return prisma.afastamentoSarh.findMany({
    where: {
      servidorId,
    },
    include: {
      tipoAfastamento: true,
    },
    orderBy: [
      {
        dataInicio: "desc",
      },
      {
        criadoEm: "desc",
      },
    ],
  });
}

export async function listarAfastamentosServidorSarhPaginado(
  servidorId: string,
  params: {
    pagina?: number;
    itensPorPagina?: number;
    grupo?: "ferias" | "outros";
  } = {},
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 8), 5),
    50,
  );

  if (!ehUuid(servidorId)) {
    return {
      afastamentos: [],
      total: 0,
      vigentes: 0,
      futuros: 0,
      pagina,
      itensPorPagina,
      totalPaginas: 1,
    };
  }

  const filtroFerias = {
    OR: [
      { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          OR: [
            { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
            { descricao: { contains: "FERIAS", mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };
  const filtroGrupo =
    params.grupo === "ferias"
      ? filtroFerias
      : params.grupo === "outros"
        ? { NOT: filtroFerias }
        : {};
  const where = { servidorId, ...filtroGrupo };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [total, vigentes, futuros] = await Promise.all([
    prisma.afastamentoSarh.count({ where }),
    prisma.afastamentoSarh.count({
      where: {
        ...where,
        ativo: true,
        dataInicio: {
          lte: hoje,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: hoje,
            },
          },
        ],
      },
    }),
    prisma.afastamentoSarh.count({
      where: {
        ...where,
        ativo: true,
        dataInicio: {
          gt: hoje,
        },
      },
    }),
  ]);
  const totalPaginas = Math.max(Math.ceil(total / itensPorPagina), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const afastamentos = await prisma.afastamentoSarh.findMany({
    where,
    include: {
      tipoAfastamento: true,
    },
    orderBy: [
      {
        dataInicio: "desc",
      },
      {
        criadoEm: "desc",
      },
    ],
    skip: (paginaAtual - 1) * itensPorPagina,
    take: itensPorPagina,
  });

  return {
    afastamentos,
    total,
    vigentes,
    futuros,
    pagina: paginaAtual,
    itensPorPagina,
    totalPaginas,
  };
}

export async function contarAfastamentosServidorSarhPorGrupo(
  servidorId: string,
  grupo: "ferias" | "outros",
) {
  if (!ehUuid(servidorId)) {
    return 0;
  }

  const filtroFerias = {
    OR: [
      { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
      { tipoDescricao: { contains: "FERIAS", mode: "insensitive" as const } },
      { origemTabela: { contains: "FERIAS", mode: "insensitive" as const } },
      {
        tipoAfastamento: {
          OR: [
            { categoria: { contains: "FERIAS", mode: "insensitive" as const } },
            { descricao: { contains: "FERIAS", mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };

  return prisma.afastamentoSarh.count({
    where: {
      servidorId,
      ...(grupo === "ferias" ? filtroFerias : { NOT: filtroFerias }),
    },
  });
}

export async function contarAfastamentosServidorSarh(servidorId: string) {
  if (!ehUuid(servidorId)) {
    return {
      total: 0,
      ativos: 0,
      futuros: 0,
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [total, ativos, futuros] = await Promise.all([
    prisma.afastamentoSarh.count({
      where: {
        servidorId,
      },
    }),
    prisma.afastamentoSarh.count({
      where: {
        servidorId,
        ativo: true,
        dataInicio: {
          lte: hoje,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: hoje,
            },
          },
        ],
      },
    }),
    prisma.afastamentoSarh.count({
      where: {
        servidorId,
        ativo: true,
        dataInicio: {
          gt: hoje,
        },
      },
    }),
  ]);

  return {
    total,
    ativos,
    futuros,
  };
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
