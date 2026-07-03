import { prisma } from "@/shared/infrastructure/database/prisma";

function ehUuid(valor?: string | null): valor is string {
  if (!valor) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function buscarServidorBiometriaPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
      biometriaFacialServidor: true,
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
  });
}

export async function buscarBiometriaAtivaPorServidorId(servidorId: string) {
  return prisma.biometriaFacialServidor.findUnique({
    where: {
      servidorId,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
    },
  });
}

export async function listarCadastrosBiometricos() {
  return prisma.biometriaFacialServidor.findMany({
    include: {
      servidor: {
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
        },
      },
    },
    orderBy: {
      atualizadoEm: "desc",
    },
  });
}

export async function buscarSessaoCadastroFacial(params: {
  sessaoId: string;
  usuarioId: string;
}) {
  return prisma.sessaoCadastroFacial.findFirst({
    where: {
      id: params.sessaoId,
      usuarioId: params.usuarioId,
    },
    include: {
      servidor: true,
    },
  });
}

export async function buscarResumoBiometriaFacialServidor(servidorId: string) {
  if (!ehUuid(servidorId)) {
    return {
      biometria: null,
      ultimaSessao: null,
      ultimaAmostra: null,
      ultimoEvento: null,
    };
  }

  const [biometria, ultimaSessao, ultimaAmostra] = await Promise.all([
    prisma.biometriaFacialServidor.findUnique({
      where: {
        servidorId,
      },
    }),
    prisma.sessaoCadastroFacial.findFirst({
      where: {
        servidorId,
      },
      orderBy: {
        criadoEm: "desc",
      },
    }),
    prisma.amostraBiometricaFacial.findFirst({
      where: {
        servidorId,
      },
      orderBy: {
        criadoEm: "desc",
      },
    }),
  ]);

  const ultimoEvento = biometria
    ? await prisma.auditoriaEvento.findFirst({
        where: {
          OR: [
            {
              entidade: "BiometriaFacialServidor",
              entidadeId: biometria.id,
            },
            {
              acao: {
                contains: "BIOMETRIA_FACIAL",
                mode: "insensitive",
              },
              OR: [
                {
                  dadosDepois: {
                    path: ["servidorId"],
                    equals: servidorId,
                  },
                },
                {
                  dadosAntes: {
                    path: ["servidorId"],
                    equals: servidorId,
                  },
                },
              ],
            },
          ],
        },
        include: {
          usuario: {
            select: {
              nome: true,
              matricula: true,
            },
          },
        },
        orderBy: {
          criadoEm: "desc",
        },
      })
    : null;

  return {
    biometria,
    ultimaSessao,
    ultimaAmostra,
    ultimoEvento,
  };
}
