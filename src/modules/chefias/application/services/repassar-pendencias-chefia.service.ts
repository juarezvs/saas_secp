import type { Prisma } from "@/generated/prisma/client";

type RepassarPendenciasChefiaParams = {
  tx: Prisma.TransactionClient;
  unidadeId: string;
  novoGestorUnidadeId: string;
  usuarioId?: string;
};

type ResultadoRepassePendencias = {
  unidadeIdsAfetadas: string[];
  solicitacoes: number;
  fechamentos: number;
};

async function listarUnidadesAfetadasPorNovaChefia(
  tx: Prisma.TransactionClient,
  unidadeId: string,
) {
  const unidades = await tx.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
      unidadePaiId: true,
    },
  });
  const titularesAtivos = await tx.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataFim: null,
      papel: "GESTOR_TITULAR",
    },
    select: {
      unidadeId: true,
    },
  });
  const unidadesComTitular = new Set(
    titularesAtivos
      .map((gestor) => gestor.unidadeId)
      .filter((id): id is string => Boolean(id)),
  );
  const filhosPorUnidade = new Map<string, string[]>();

  for (const unidade of unidades) {
    if (!unidade.unidadePaiId) {
      continue;
    }

    filhosPorUnidade.set(unidade.unidadePaiId, [
      ...(filhosPorUnidade.get(unidade.unidadePaiId) ?? []),
      unidade.id,
    ]);
  }

  const afetadas = new Set([unidadeId]);
  const visitar = [...(filhosPorUnidade.get(unidadeId) ?? [])];

  while (visitar.length > 0) {
    const atual = visitar.shift();

    if (!atual || unidadesComTitular.has(atual)) {
      continue;
    }

    afetadas.add(atual);
    visitar.push(...(filhosPorUnidade.get(atual) ?? []));
  }

  return Array.from(afetadas);
}

export async function repassarPendenciasParaNovaChefia({
  tx,
  unidadeId,
  novoGestorUnidadeId,
  usuarioId,
}: RepassarPendenciasChefiaParams): Promise<ResultadoRepassePendencias> {
  const unidadeIdsAfetadas = await listarUnidadesAfetadasPorNovaChefia(
    tx,
    unidadeId,
  );

  const solicitacoes = await tx.solicitacao.updateMany({
    where: {
      unidadeId: {
        in: unidadeIdsAfetadas,
      },
      status: {
        in: ["ENVIADA", "EM_ANALISE"],
      },
      OR: [
        {
          chefiaResponsavelId: null,
        },
        {
          chefiaResponsavelId: {
            not: novoGestorUnidadeId,
          },
        },
      ],
    },
    data: {
      chefiaResponsavelId: novoGestorUnidadeId,
    },
  });
  const fechamentos = await tx.fechamentoMensalUnidade.updateMany({
    where: {
      unidadeId: {
        in: unidadeIdsAfetadas,
      },
      status: {
        in: ["ABERTO", "EM_HOMOLOGACAO", "HOMOLOGADO_PARCIAL"],
      },
      OR: [
        {
          gestorResponsavelId: null,
        },
        {
          gestorResponsavelId: {
            not: novoGestorUnidadeId,
          },
        },
      ],
    },
    data: {
      gestorResponsavelId: novoGestorUnidadeId,
    },
  });
  const resultado = {
    unidadeIdsAfetadas,
    solicitacoes: solicitacoes.count,
    fechamentos: fechamentos.count,
  };

  if (resultado.solicitacoes > 0 || resultado.fechamentos > 0) {
    await tx.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: "GestorUnidade",
        entidadeId: novoGestorUnidadeId,
        acao: "PENDENCIAS_CHEFIA_REPASSADAS",
        dadosDepois: resultado,
      },
    });
  }

  return resultado;
}
