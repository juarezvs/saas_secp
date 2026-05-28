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

  return prisma.marcacaoBruta.findMany({
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
}
