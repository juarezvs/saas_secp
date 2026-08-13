import { prisma } from "@/shared/infrastructure/database/prisma";

export async function buscarAtestoHorasExtrasPorAutorizacaoId(
  autorizacaoId: string,
) {
  return prisma.horaExtraAtesto.findFirst({
    where: {
      autorizacaoId,
    },
    include: {
      gestor: {
        select: {
          nome: true,
          matricula: true,
        },
      },
      autorizacao: {
        include: {
          orgao: true,
          unidade: true,
        },
      },
    },
    orderBy: {
      emitidoEm: "desc",
    },
  });
}
