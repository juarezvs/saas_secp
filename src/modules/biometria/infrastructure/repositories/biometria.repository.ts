import { prisma } from "@/shared/infrastructure/database/prisma";

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
