import { prisma } from "@/shared/infrastructure/database/prisma";


export async function cpfServidorExiste(cpf: string) {
  if (!cpf) {
    return false;
  }

  const servidor = await prisma.servidor.findUnique({
    where: {
      cpf,
    },
    select: {
      id: true,
    },
  });

  return Boolean(servidor);
}

export async function listarServidores() {
  return prisma.servidor.findMany({
    orderBy: {
      matricula: "asc",
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
      },
      _count: {
        select: {
          lotacoes: true,
          gestores: true,
        },
      },
    },
  });
}

export async function buscarServidorPorId(id: string) {
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
    },
  });
}

export async function matriculaServidorExiste(
  matricula: string,
  ignorarServidorId?: string,
) {
  const servidor = await prisma.servidor.findUnique({
    where: {
      matricula,
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

export async function usuarioMatriculaExiste(
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
