import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarJornadas() {
  return prisma.jornada.findMany({
    orderBy: {
      codigo: "asc",
    },
    include: {
      _count: {
        select: {
          escalas: true,
          servidores: true,
        },
      },
    },
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