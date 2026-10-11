import { prisma } from "@/shared/infrastructure/database/prisma";

export type EstadoComCidadesSelecao = {
  id: number;
  sigla: string;
  nome: string;
  cidades: Array<{ id: number; nome: string }>;
};

export async function listarEstadosComCidadesAtivas(): Promise<
  EstadoComCidadesSelecao[]
> {
  return prisma.estado.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      sigla: true,
      nome: true,
      cidades: {
        where: { ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      },
    },
  });
}
