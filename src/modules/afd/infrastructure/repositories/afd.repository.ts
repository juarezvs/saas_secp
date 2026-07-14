import { buscarEquipamentosBiometricosPorIdsOuCodigosEmLotes } from "@/modules/integracoes/infrastructure/repositories/equipamento-biometrico-lotes.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarImportacoesAfd() {
  return prisma.importacaoAfd.findMany({
    orderBy: {
      criadoEm: "desc",
    },
    include: {
      arquivos: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
    take: 50,
  });
}

export async function buscarImportacaoAfdPorId(id: string) {
  return prisma.importacaoAfd.findUnique({
    where: {
      id,
    },
    include: {
      arquivos: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });
}

export async function listarMarcacoesBrutasPorImportacaoAfd(
  importacaoId: string,
) {
  const arquivos = await prisma.arquivoAfd.findMany({
    where: {
      importacaoId,
    },
    select: {
      id: true,
    },
  });

  const arquivoIds = arquivos.map((arquivo) => arquivo.id);

  if (arquivoIds.length === 0) {
    return [];
  }

  const marcacoes = await prisma.marcacaoBruta.findMany({
    where: {
      arquivoAfdId: {
        in: arquivoIds,
      },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
      marcacao: true,
      arquivoAfd: true,
    },
    orderBy: {
      dataHora: "desc",
    },
    take: 500,
  });

  const equipamentoIds = marcacoes
    .map((item) => item.equipamentoId)
    .filter((id): id is string => Boolean(id));
  const equipamentoCodigos = marcacoes
    .map((item) => item.equipamentoCodigo)
    .filter((codigo): codigo is string => Boolean(codigo));
  if (equipamentoIds.length === 0 && equipamentoCodigos.length === 0) {
    return marcacoes.map((item) => ({ ...item, equipamento: null }));
  }

  const equipamentos = await buscarEquipamentosBiometricosPorIdsOuCodigosEmLotes({
    ids: equipamentoIds,
    codigos: equipamentoCodigos,
  });
  const porId = new Map(equipamentos.map((item) => [item.id, item]));
  const porCodigo = new Map(equipamentos.map((item) => [item.codigo, item]));

  return marcacoes.map((item) => ({
    ...item,
    equipamento:
      (item.equipamentoId ? porId.get(item.equipamentoId) : null) ??
      (item.equipamentoCodigo ? porCodigo.get(item.equipamentoCodigo) : null) ??
      null,
  }));
}
