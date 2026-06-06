import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarMarcacoesBrutasParams = {
  pagina?: number;
  itensPorPagina?: number;
  limite?: number;
  processada?: string;
  origem?: string;
  busca?: string;
};

function ehOrigemMarcacaoBruta(valor?: string | null) {
  return [
    "EQUIPAMENTO_BIOMETRICO",
    "IMPORTACAO_AFD",
    "WEB_AUTORIZADO",
    "FACIAL_AUTORIZADO",
  ].includes(valor ?? "");
}

export function montarWhereMarcacoesBrutas(
  params?: ListarMarcacoesBrutasParams,
) {
  const busca = params?.busca?.trim();

  return {
    ...(params?.processada === "true"
      ? { processada: true }
      : params?.processada === "false"
        ? { processada: false }
        : {}),
    ...(params?.origem && ehOrigemMarcacaoBruta(params.origem)
      ? { origem: params.origem as never }
      : {}),
    ...(busca
      ? {
          OR: [
            { cpf: { contains: busca } },
            { matricula: { contains: busca } },
            { equipamentoCodigo: { contains: busca } },
            { nsr: { contains: busca } },
            { codigoExterno: { contains: busca } },
            {
              servidor: {
                usuario: {
                  nome: { contains: busca, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };
}

const includeMarcacaoBrutaListagem = {
  servidor: {
    include: {
      usuario: true,
    },
  },
  marcacao: true,
  arquivoAfd: {
    select: {
      nomeOriginal: true,
    },
  },
};

async function anexarEquipamentosAsMarcacoesBrutas<
  T extends { equipamentoId: string | null; equipamentoCodigo: string | null },
>(marcacoes: T[]) {
  const equipamentoIds = marcacoes
    .map((item) => item.equipamentoId)
    .filter((id): id is string => Boolean(id));
  const equipamentoCodigos = marcacoes
    .map((item) => item.equipamentoCodigo)
    .filter((codigo): codigo is string => Boolean(codigo));

  const filtros = [
    equipamentoIds.length > 0 ? { id: { in: equipamentoIds } } : null,
    equipamentoCodigos.length > 0 ? { codigo: { in: equipamentoCodigos } } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (filtros.length === 0) {
    return marcacoes.map((item) => ({
      ...item,
      equipamento: null,
    }));
  }

  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: {
      OR: filtros,
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      numeroSerie: true,
    },
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

export async function listarMarcacoesBrutasPendentes(params?: {
  limite?: number;
}) {
  return prisma.marcacaoBruta.findMany({
    where: {
      processada: false,
    },
    orderBy: {
      dataHora: "desc",
    },
    take: params?.limite ?? 100,
  });
}

export async function listarMarcacoesBrutasPorServidorPendente(params: {
  cpf?: string | null;
  matricula?: string | null;
}) {
  const filtros = [];

  if (params.cpf) {
    filtros.push({
      cpf: params.cpf,
    });
  }

  if (params.matricula) {
    filtros.push({
      matricula: params.matricula,
    });
  }

  if (filtros.length === 0) {
    return [];
  }

  return prisma.marcacaoBruta.findMany({
    where: {
      processada: false,
      OR: filtros,
    },
    orderBy: {
      dataHora: "asc",
    },
  });
}

export async function listarMarcacoesBrutas(
  params?: ListarMarcacoesBrutasParams,
) {
  const marcacoes = await prisma.marcacaoBruta.findMany({
    where: montarWhereMarcacoesBrutas(params),
    include: includeMarcacaoBrutaListagem,
    orderBy: {
      dataHora: "desc",
    },
    take: params?.limite ?? 100,
  });

  return anexarEquipamentosAsMarcacoesBrutas(marcacoes);
}

export async function listarMarcacoesBrutasPaginado(
  params: ListarMarcacoesBrutasParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? params.limite ?? 20), 5),
    100,
  );
  const where = montarWhereMarcacoesBrutas(params);

  const [total, marcacoesBase] = await Promise.all([
    prisma.marcacaoBruta.count({ where }),
    prisma.marcacaoBruta.findMany({
      where,
      include: includeMarcacaoBrutaListagem,
      orderBy: {
        dataHora: "desc",
      },
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);
  const marcacoes = await anexarEquipamentosAsMarcacoesBrutas(marcacoesBase);

  return {
    marcacoes,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarMarcacoesBrutasParaExportacao(
  params: ListarMarcacoesBrutasParams,
) {
  const marcacoes = await prisma.marcacaoBruta.findMany({
    where: montarWhereMarcacoesBrutas(params),
    include: includeMarcacaoBrutaListagem,
    orderBy: {
      dataHora: "desc",
    },
  });

  return anexarEquipamentosAsMarcacoesBrutas(marcacoes);
}
