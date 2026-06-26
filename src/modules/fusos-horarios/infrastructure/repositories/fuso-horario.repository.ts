import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarFusosHorariosParams = {
  busca?: string;
  status?: string;
};

export function montarWhereFusosHorarios(
  params: ListarFusosHorariosParams = {},
) {
  const busca = params.busca?.trim();

  return {
    ...(params.status === "ativo"
      ? { ativo: true }
      : params.status === "inativo"
        ? { ativo: false }
        : {}),
    ...(busca
      ? {
          OR: [
            { valor: { contains: busca, mode: "insensitive" as const } },
            { rotulo: { contains: busca, mode: "insensitive" as const } },
            { descricao: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listarFusosHorarios(
  params: ListarFusosHorariosParams = {},
) {
  return prisma.fusoHorario.findMany({
    where: montarWhereFusosHorarios(params),
    orderBy: [{ ativo: "desc" }, { valor: "asc" }],
  });
}

export async function listarFusosHorariosAtivos() {
  return prisma.fusoHorario.findMany({
    where: {
      ativo: true,
    },
    orderBy: [{ valor: "asc" }],
    select: {
      id: true,
      valor: true,
      rotulo: true,
    },
  });
}

export async function buscarFusoHorarioPorId(id: string) {
  return prisma.fusoHorario.findUnique({
    where: {
      id,
    },
  });
}

export async function existeFusoHorarioComValor(valor: string, ignorarId?: string) {
  const fuso = await prisma.fusoHorario.findFirst({
    where: {
      valor,
      ...(ignorarId
        ? {
            id: {
              not: ignorarId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  return Boolean(fuso);
}
