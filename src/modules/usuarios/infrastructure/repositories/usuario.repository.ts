import { prisma } from "@/shared/infrastructure/database/prisma";

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
  ignorarUsuarioId?: string
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
  ignorarUsuarioId?: string
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