import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { listarIdsUnidadesBasePorSubstituicaoAutomatica } from "./substituicoes-automaticas.service";

export async function listarIdsUnidadesSubordinadasPorUsuario(
  usuarioId: string,
) {
  const hoje = new Date();

  const gestores = await prismaListagem.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataInicio: {
        lte: hoje,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
      servidor: {
        usuarioId,
        ativo: true,
      },
    },
    select: {
      unidadeId: true,
    },
  });

  const unidadesSubstituicao =
    await listarIdsUnidadesBasePorSubstituicaoAutomatica(usuarioId, hoje);
  const visitadas = new Set([
    ...gestores.map((gestor) => gestor.unidadeId),
    ...unidadesSubstituicao,
  ]);
  let fronteira = Array.from(visitadas);

  while (fronteira.length > 0) {
    const filhas = await prismaListagem.unidadeOrganizacional.findMany({
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
