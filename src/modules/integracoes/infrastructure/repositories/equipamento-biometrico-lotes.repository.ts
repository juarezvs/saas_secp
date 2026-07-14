import { prisma } from "@/shared/infrastructure/database/prisma";

const TAMANHO_LOTE_FILTRO_EQUIPAMENTO = 1000;

function valoresUnicos(valores: string[]) {
  return Array.from(new Set(valores.filter(Boolean)));
}

function quebrarEmLotes<T>(valores: T[], tamanho: number) {
  const lotes: T[][] = [];

  for (let indice = 0; indice < valores.length; indice += tamanho) {
    lotes.push(valores.slice(indice, indice + tamanho));
  }

  return lotes;
}

export async function buscarEquipamentosBiometricosPorIdsOuCodigosEmLotes(params: {
  ids?: string[];
  codigos?: string[];
}) {
  const ids = valoresUnicos(params.ids ?? []);
  const codigos = valoresUnicos(params.codigos ?? []);
  const lotesIds = quebrarEmLotes(ids, TAMANHO_LOTE_FILTRO_EQUIPAMENTO);
  const lotesCodigos = quebrarEmLotes(codigos, TAMANHO_LOTE_FILTRO_EQUIPAMENTO);

  const equipamentos = await Promise.all([
    ...lotesIds.map((lote) =>
      prisma.equipamentoBiometrico.findMany({
        where: {
          id: {
            in: lote,
          },
        },
        select: {
          id: true,
          codigo: true,
          nome: true,
          numeroSerie: true,
        },
      }),
    ),
    ...lotesCodigos.map((lote) =>
      prisma.equipamentoBiometrico.findMany({
        where: {
          codigo: {
            in: lote,
          },
        },
        select: {
          id: true,
          codigo: true,
          nome: true,
          numeroSerie: true,
        },
      }),
    ),
  ]);

  return Array.from(
    new Map(equipamentos.flat().map((equipamento) => [equipamento.id, equipamento])).values(),
  );
}
