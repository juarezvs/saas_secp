import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarIdsUnidadesSubordinadasPorUsuario(
  usuarioId: string,
) {
  const gestores = await prisma.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataFim: null,
      servidor: {
        usuarioId,
        ativo: true,
      },
    },
    select: {
      unidadeId: true,
    },
  });

  const visitadas = new Set(gestores.map((gestor) => gestor.unidadeId));
  let fronteira = Array.from(visitadas);

  while (fronteira.length > 0) {
    const filhas = await prisma.unidadeOrganizacional.findMany({
      where: {
        unidadePaiId: {
          in: fronteira,
        },
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    const novas = filhas
      .map((unidade) => unidade.id)
      .filter((id) => !visitadas.has(id));

    for (const id of novas) {
      visitadas.add(id);
    }

    fronteira = novas;
  }

  return Array.from(visitadas);
}
