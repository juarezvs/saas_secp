import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarJornadasParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  codigo?: string;
  nome?: string;
  tipo?: string;
  status?: string;
};

function ehTipoJornada(valor?: string | null) {
  return ["SETE_HORAS", "OITO_HORAS", "ESPECIAL"].includes(valor ?? "");
}

export function montarWhereJornadas(params: ListarJornadasParams) {
  const busca = params.busca?.trim();
  const tipo = params.tipo?.trim();

  return {
    ...(params.status === "ativa"
      ? { ativo: true }
      : params.status === "inativa"
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

    ...(tipo && ehTipoJornada(tipo) ? { tipo: tipo as never } : {}),

    ...(busca
      ? {
          OR: [
            { codigo: { contains: busca, mode: "insensitive" as const } },
            { nome: { contains: busca, mode: "insensitive" as const } },
            { descricao: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const includeJornadaListagem = {
  _count: {
    select: {
      escalas: true,
      servidores: true,
    },
  },
};

export async function listarJornadas() {
  return prisma.jornada.findMany({
    orderBy: {
      codigo: "asc",
    },
    include: includeJornadaListagem,
  });
}

export async function listarJornadasPaginado(params: ListarJornadasParams) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereJornadas(params);

  const [total, jornadas] = await Promise.all([
    prisma.jornada.count({ where }),
    prisma.jornada.findMany({
      where,
      orderBy: [{ codigo: "asc" }, { nome: "asc" }],
      include: includeJornadaListagem,
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    jornadas,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarJornadasParaExportacao(
  params: ListarJornadasParams,
) {
  return prisma.jornada.findMany({
    where: montarWhereJornadas(params),
    orderBy: [{ codigo: "asc" }, { nome: "asc" }],
    include: includeJornadaListagem,
  });
}

export async function listarJornadasAtivas() {
  return prisma.jornada.findMany({
    where: {
      ativo: true,
    },
    orderBy: {
      codigo: "asc",
    },
  });
}

export async function buscarJornadaPorId(id: string) {
  return prisma.jornada.findUnique({
    where: {
      id,
    },
    include: {
      escalas: {
        include: {
          dias: {
            orderBy: {
              diaSemana: "asc",
            },
          },
        },
      },
      servidores: {
        include: {
          servidor: {
            include: {
              usuario: true,
            },
          },
          escala: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });
}

export async function codigoJornadaExiste(codigo: string, ignorarId?: string) {
  const jornada = await prisma.jornada.findUnique({
    where: {
      codigo,
    },
  });

  if (!jornada) return false;
  if (ignorarId && jornada.id === ignorarId) return false;

  return true;
}

export async function listarServidoresAtivosParaJornada() {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
      usuario: {
        ativo: true,
      },
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
      jornadas: {
        where: {
          ativo: true,
          dataFim: null,
        },
        include: {
          jornada: true,
          escala: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
    orderBy: {
      matricula: "asc",
    },
  });
}

export async function listarEscalasAtivasPorJornada(jornadaId: string) {
  return prisma.escala.findMany({
    where: {
      jornadaId,
      ativo: true,
    },
    orderBy: {
      codigo: "asc",
    },
  });
}

export async function buscarJornadaServidorAtiva(servidorId: string) {
  return prisma.jornadaServidor.findFirst({
    where: {
      servidorId,
      ativo: true,
      dataFim: null,
    },
    include: {
      jornada: true,
      escala: true,
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
}
