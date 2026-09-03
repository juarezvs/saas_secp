import { buscarEquipamentosBiometricosPorIdsOuCodigosEmLotes } from "@/modules/integracoes/infrastructure/repositories/equipamento-biometrico-lotes.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type ListarMarcacoesBrutasParams = {
  pagina?: number;
  itensPorPagina?: number;
  limite?: number;
  processada?: string;
  origem?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  cpf?: string;
  matricula?: string;
  servidorId?: string;
  equipamentoCodigo?: string;
  nsr?: string;
  orgaoId?: string;
  orgaoIdsPermitidos?: string[];
  servidorIdsPermitidos?: string[];
  equipamentoIdsPermitidos?: string[];
  equipamentoCodigosPermitidos?: string[];
  equipamentoIdsBusca?: string[];
  equipamentoCodigosBusca?: string[];
};

function ehOrigemMarcacaoBruta(valor?: string | null) {
  return [
    "EQUIPAMENTO_BIOMETRICO",
    "IMPORTACAO_AFD",
    "WEB_AUTORIZADO",
    "FACIAL_AUTORIZADO",
    "TOTEM_FACIAL_SECP",
  ].includes(valor ?? "");
}

function normalizarDigitos(valor?: string | null) {
  return valor?.replace(/\D/g, "") ?? "";
}

function parseDataInicio(valor?: string | null) {
  if (!valor?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null;
  }

  return new Date(`${valor}T00:00:00.000-04:00`);
}

function parseDataFim(valor?: string | null) {
  if (!valor?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null;
  }

  return new Date(`${valor}T23:59:59.999-04:00`);
}

export function montarWhereMarcacoesBrutas(
  params?: ListarMarcacoesBrutasParams,
) {
  const busca = params?.busca?.trim();
  const orgaoIdsPermitidos = params?.orgaoIdsPermitidos?.filter(Boolean);
  const servidorIdsPermitidos = params?.servidorIdsPermitidos?.filter(Boolean);
  const equipamentoIdsPermitidos =
    params?.equipamentoIdsPermitidos?.filter(Boolean);
  const equipamentoCodigosPermitidos =
    params?.equipamentoCodigosPermitidos?.filter(Boolean);
  const equipamentoIdsBusca = params?.equipamentoIdsBusca?.filter(Boolean);
  const equipamentoCodigosBusca =
    params?.equipamentoCodigosBusca?.filter(Boolean);
  const dataInicio = parseDataInicio(params?.dataInicio);
  const dataFim = parseDataFim(params?.dataFim);
  const cpf = normalizarDigitos(params?.cpf);
  const matricula = params?.matricula?.trim();
  const servidorId = params?.servidorId?.trim();
  const equipamentoCodigo = params?.equipamentoCodigo?.trim();
  const nsr = params?.nsr?.trim();
  const filtros: Prisma.MarcacaoBrutaWhereInput[] = [];

  if (servidorIdsPermitidos !== undefined) {
    filtros.push({ servidorId: { in: servidorIdsPermitidos } });
  } else if (
    orgaoIdsPermitidos?.length ||
    equipamentoIdsPermitidos?.length ||
    equipamentoCodigosPermitidos?.length
  ) {
    filtros.push({
      OR: [
        ...(orgaoIdsPermitidos?.length
          ? [
              {
                servidor: {
                  orgaoId: {
                    in: orgaoIdsPermitidos,
                  },
                },
              },
            ]
          : []),
        ...(equipamentoIdsPermitidos?.length
          ? [{ equipamentoId: { in: equipamentoIdsPermitidos } }]
          : []),
        ...(equipamentoCodigosPermitidos?.length
          ? [{ equipamentoCodigo: { in: equipamentoCodigosPermitidos } }]
          : []),
      ],
    });
  }

  if (params?.processada === "true") {
    filtros.push({ processada: true });
  } else if (params?.processada === "false") {
    filtros.push({ processada: false });
  }

  if (params?.origem && ehOrigemMarcacaoBruta(params.origem)) {
    filtros.push({ origem: params.origem as never });
  }

  if (dataInicio || dataFim) {
    filtros.push({
      dataHora: {
        ...(dataInicio ? { gte: dataInicio } : {}),
        ...(dataFim ? { lte: dataFim } : {}),
      },
    });
  }

  if (cpf) {
    filtros.push({ cpf: { contains: cpf } });
  }

  if (matricula) {
    filtros.push({
      OR: [
        { matricula: { contains: matricula, mode: "insensitive" } },
        {
          servidor: {
            matricula: { contains: matricula, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (servidorId) {
    filtros.push({ servidorId });
  }

  if (equipamentoCodigo) {
    filtros.push({ equipamentoCodigo });
  }

  if (nsr) {
    filtros.push({
      OR: [
        { nsr: { contains: nsr, mode: "insensitive" } },
        { codigoExterno: { contains: nsr, mode: "insensitive" } },
      ],
    });
  }

  if (params?.orgaoId) {
    filtros.push({
      OR: [
        {
          servidor: {
            orgaoId: params.orgaoId,
          },
        },
        ...(equipamentoIdsPermitidos?.length
          ? [{ equipamentoId: { in: equipamentoIdsPermitidos } }]
          : []),
        ...(equipamentoCodigosPermitidos?.length
          ? [{ equipamentoCodigo: { in: equipamentoCodigosPermitidos } }]
          : []),
      ],
    });
  }

  if (busca) {
    filtros.push({
      OR: [
        { cpf: { contains: busca } },
        { matricula: { contains: busca, mode: "insensitive" } },
        { equipamentoCodigo: { contains: busca, mode: "insensitive" } },
        ...(equipamentoIdsBusca?.length
          ? [{ equipamentoId: { in: equipamentoIdsBusca } }]
          : []),
        ...(equipamentoCodigosBusca?.length
          ? [{ equipamentoCodigo: { in: equipamentoCodigosBusca } }]
          : []),
        {
          payloadOriginal: {
            path: ["equipamentoOrigem", "nome"],
            string_contains: busca,
          },
        },
        {
          payloadOriginal: {
            path: ["equipamentoOrigem", "ip"],
            string_contains: busca,
          },
        },
        {
          payloadOriginal: {
            path: ["equipamentoOrigem", "nomeMaquina"],
            string_contains: busca,
          },
        },
        {
          payloadOriginal: {
            path: ["equipamentoOrigem", "userAgent"],
            string_contains: busca,
          },
        },
        { nsr: { contains: busca, mode: "insensitive" } },
        { codigoExterno: { contains: busca, mode: "insensitive" } },
        {
          servidor: {
            nomeFuncional: {
              contains: busca,
              mode: "insensitive" as const,
            },
          },
        },
        {
          servidor: {
            nomeCompletoSarh: {
              contains: busca,
              mode: "insensitive" as const,
            },
          },
        },
        {
          servidor: {
            usuario: {
              nome: { contains: busca, mode: "insensitive" as const },
            },
          },
        },
      ],
    });
  }

  return filtros.length ? { AND: filtros } : {};
}

async function enriquecerBuscaComEquipamentos(
  params?: ListarMarcacoesBrutasParams,
): Promise<ListarMarcacoesBrutasParams | undefined> {
  const busca = params?.busca?.trim();

  if (!busca) {
    return params;
  }

  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: {
      ...(params?.orgaoIdsPermitidos?.length
        ? { orgaoId: { in: params.orgaoIdsPermitidos } }
        : params?.orgaoId
          ? { orgaoId: params.orgaoId }
          : {}),
      OR: [
        { codigo: { contains: busca, mode: "insensitive" } },
        { nome: { contains: busca, mode: "insensitive" } },
        { ip: { contains: busca, mode: "insensitive" } },
        { fabricante: { contains: busca, mode: "insensitive" } },
        { modelo: { contains: busca, mode: "insensitive" } },
        { numeroSerie: { contains: busca, mode: "insensitive" } },
        { localizacao: { contains: busca, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      codigo: true,
    },
    take: 500,
  });

  if (equipamentos.length === 0) {
    return params;
  }

  return {
    ...params,
    equipamentoIdsBusca: equipamentos.map((equipamento) => equipamento.id),
    equipamentoCodigosBusca: equipamentos.map(
      (equipamento) => equipamento.codigo,
    ),
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

  if (equipamentoIds.length === 0 && equipamentoCodigos.length === 0) {
    return marcacoes.map((item) => ({
      ...item,
      equipamento: null,
    }));
  }

  const equipamentos =
    await buscarEquipamentosBiometricosPorIdsOuCodigosEmLotes({
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

export async function listarMarcacoesBrutasPendentes(params?: {
  limite?: number;
  cursorId?: string | null;
}) {
  const limite = params?.limite ?? 100;
  return prisma.marcacaoBruta.findMany({
    where: {
      processada: false,
      servidorId: { not: null },
    },
    orderBy: [{ dataHora: "desc" }, { id: "desc" }],
    ...(params?.cursorId
      ? {
          cursor: { id: params.cursorId },
          skip: 1,
        }
      : {}),
    take: limite,
  });
}

export async function listarMarcacoesBrutasPorServidorPendente(params: {
  cpf?: string | null;
  pis?: string | null;
  matricula?: string | null;
  identificadores?: string[];
}) {
  const filtros = [];

  if (params.cpf) {
    filtros.push({
      cpf: params.cpf,
    });
  }

  if (params.pis) {
    filtros.push({
      pis: params.pis,
    });
  }

  if (params.matricula) {
    filtros.push({
      matricula: params.matricula,
    });
  }

  const identificadores = params.identificadores
    ?.map((valor) => valor.trim())
    .filter(Boolean);

  if (identificadores?.length) {
    filtros.push(
      ...identificadores.map((identificador) => ({
        matricula: { equals: identificador, mode: "insensitive" as const },
      })),
      { cpf: { in: identificadores } },
      { pis: { in: identificadores } },
    );
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
  const filtros = await enriquecerBuscaComEquipamentos(params);
  const marcacoes = await prisma.marcacaoBruta.findMany({
    where: montarWhereMarcacoesBrutas(filtros),
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
  const filtros = await enriquecerBuscaComEquipamentos(params);
  const where = montarWhereMarcacoesBrutas(filtros);

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
  const filtros = await enriquecerBuscaComEquipamentos(params);
  const marcacoes = await prisma.marcacaoBruta.findMany({
    where: montarWhereMarcacoesBrutas(filtros),
    include: includeMarcacaoBrutaListagem,
    orderBy: {
      dataHora: "desc",
    },
  });

  return anexarEquipamentosAsMarcacoesBrutas(marcacoes);
}
