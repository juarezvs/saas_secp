import { prisma } from "@/shared/infrastructure/database/prisma";

export type ListarIntegracoesSistemaParams = {
  pagina?: number;
  itensPorPagina?: number;
  busca?: string;
  tipo?: string;
  status?: string;
  direcao?: string;
  ativo?: string;
};

function ehTipoIntegracao(valor?: string | null) {
  return ["SARH", "SEI", "EQUIPAMENTO_BIOMETRICO", "LDAP", "WEBHOOK", "OUTRO"].includes(
    valor ?? "",
  );
}

function ehStatusIntegracao(valor?: string | null) {
  return ["ATIVA", "INATIVA", "ERRO", "NAO_CONFIGURADA"].includes(valor ?? "");
}

function ehDirecaoIntegracao(valor?: string | null) {
  return ["ENTRADA", "SAIDA", "BIDIRECIONAL"].includes(valor ?? "");
}

export function montarWhereIntegracoesSistema(
  params: ListarIntegracoesSistemaParams = {},
) {
  const busca = params.busca?.trim();

  return {
    ...(params.tipo && ehTipoIntegracao(params.tipo)
      ? { tipo: params.tipo as never }
      : {}),
    ...(params.status && ehStatusIntegracao(params.status)
      ? { status: params.status as never }
      : {}),
    ...(params.direcao && ehDirecaoIntegracao(params.direcao)
      ? { direcao: params.direcao as never }
      : {}),
    ...(params.ativo === "true"
      ? { ativo: true }
      : params.ativo === "false"
        ? { ativo: false }
        : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" as const } },
            { descricao: { contains: busca, mode: "insensitive" as const } },
            { baseUrl: { contains: busca, mode: "insensitive" as const } },
            { ultimoErro: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const includeIntegracaoListagem = {
  _count: {
    select: {
      logs: true,
      equipamentos: true,
    },
  },
};

export async function listarIntegracoesSistema() {
  return prisma.integracaoSistema.findMany({
    orderBy: {
      nome: "asc",
    },
    include: includeIntegracaoListagem,
  });
}

export async function listarIntegracoesSistemaPaginado(
  params: ListarIntegracoesSistemaParams,
) {
  const pagina = Math.max(Number(params.pagina ?? 1), 1);
  const itensPorPagina = Math.min(
    Math.max(Number(params.itensPorPagina ?? 10), 5),
    100,
  );
  const where = montarWhereIntegracoesSistema(params);

  const [total, integracoes] = await Promise.all([
    prisma.integracaoSistema.count({ where }),
    prisma.integracaoSistema.findMany({
      where,
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
      include: includeIntegracaoListagem,
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
  ]);

  return {
    integracoes,
    total,
    pagina,
    itensPorPagina,
    totalPaginas: Math.max(Math.ceil(total / itensPorPagina), 1),
  };
}

export async function listarIntegracoesSistemaParaExportacao(
  params: ListarIntegracoesSistemaParams,
) {
  return prisma.integracaoSistema.findMany({
    where: montarWhereIntegracoesSistema(params),
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    include: includeIntegracaoListagem,
  });
}

export async function listarEquipamentosBiometricos(params?: {
  orgaoId?: string | null;
  orgaoIdsPermitidos?: string[];
}) {
  const orgaoIds =
    params?.orgaoId
      ? [params.orgaoId]
      : params?.orgaoIdsPermitidos
        ? params.orgaoIdsPermitidos
        : null;

  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: orgaoIds
      ? {
          OR: [
            { orgaoId: { in: orgaoIds } },
            { unidade: { orgaoId: { in: orgaoIds } } },
          ],
        }
      : undefined,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      orgao: true,
      unidade: true,
      integracao: true,
      _count: {
        select: {
          eventos: true,
        },
      },
    },
  });

  const totais = await prisma.marcacaoBruta.groupBy({
    by: ["equipamentoId", "processada"],
    where: {
      equipamentoId: {
        in: equipamentos.map((equipamento) => equipamento.id),
      },
    },
    _count: {
      _all: true,
    },
  });

  const totaisPorEquipamento = new Map<
    string,
    { marcacoesBrutas: number; marcacoesPendentes: number }
  >();

  for (const total of totais) {
    if (!total.equipamentoId) continue;

    const atual =
      totaisPorEquipamento.get(total.equipamentoId) ?? {
        marcacoesBrutas: 0,
        marcacoesPendentes: 0,
      };
    atual.marcacoesBrutas += total._count._all;

    if (!total.processada) {
      atual.marcacoesPendentes += total._count._all;
    }

    totaisPorEquipamento.set(total.equipamentoId, atual);
  }

  return equipamentos.map((equipamento) => ({
    ...equipamento,
    estatisticasMarcacoes: totaisPorEquipamento.get(equipamento.id) ?? {
      marcacoesBrutas: 0,
      marcacoesPendentes: 0,
    },
  }));
}

export async function listarLogsIntegracao(params?: { limite?: number }) {
  return prisma.logIntegracao.findMany({
    take: params?.limite ?? 50,
    orderBy: {
      iniciadoEm: "desc",
    },
    include: {
      integracao: true,
    },
  });
}

export async function listarUnidadesParaEquipamentos(params?: {
  orgaoId?: string | null;
  orgaoIdsPermitidos?: string[];
}) {
  const orgaoIds =
    params?.orgaoId
      ? [params.orgaoId]
      : params?.orgaoIdsPermitidos
        ? params.orgaoIdsPermitidos
        : null;

  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
      ...(orgaoIds ? { orgaoId: { in: orgaoIds } } : {}),
    },
    orderBy: [
      {
        orgao: {
          sigla: "asc",
        },
      },
      {
        sigla: "asc",
      },
      {
        nome: "asc",
      },
    ],
    select: {
      id: true,
      sigla: true,
      nome: true,
      orgaoId: true,
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
    },
  });
}

export async function garantirUnidadeRaizParaEquipamentos(orgaoId?: string | null) {
  if (!orgaoId) {
    return null;
  }

  const existente = await prisma.unidadeOrganizacional.findFirst({
    where: {
      orgaoId,
      ativo: true,
    },
    select: {
      id: true,
    },
    orderBy: [{ unidadePaiId: "asc" }, { sigla: "asc" }],
  });

  if (existente) {
    return existente;
  }

  const orgao = await prisma.orgao.findUnique({
    where: { id: orgaoId },
    select: {
      id: true,
      sigla: true,
      nome: true,
      fusoHorario: true,
    },
  });

  if (!orgao) {
    return null;
  }

  return prisma.unidadeOrganizacional.upsert({
    where: {
      orgaoId_codigo: {
        orgaoId: orgao.id,
        codigo: orgao.sigla,
      },
    },
    update: {
      ativo: true,
      sigla: orgao.sigla,
      nome: orgao.nome,
      tipo: "SECAO_JUDICIARIA",
      fusoHorario: orgao.fusoHorario,
    },
    create: {
      orgaoId: orgao.id,
      codigo: orgao.sigla,
      sigla: orgao.sigla,
      nome: orgao.nome,
      tipo: "SECAO_JUDICIARIA",
      ativo: true,
      fusoHorario: orgao.fusoHorario,
    },
    select: {
      id: true,
    },
  });
}

export async function buscarOuCriarIntegracaoSarh() {
  const sarhConfigurado = Boolean(
    process.env.SARH_DB_TNS_ALIAS ?? process.env.DB_TNS_ALIAS,
  );

  return prisma.integracaoSistema.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000101",
    },
    update: {
      nome: "SARH",
      tipo: "SARH",
      direcao: "ENTRADA",
      baseUrl: sarhConfigurado ? "oracle://SARH" : null,
      status: sarhConfigurado ? "ATIVA" : "NAO_CONFIGURADA",
      ativo: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      nome: "SARH",
      tipo: "SARH",
      direcao: "ENTRADA",
      baseUrl: sarhConfigurado ? "oracle://SARH" : null,
      status: sarhConfigurado ? "ATIVA" : "NAO_CONFIGURADA",
      ativo: true,
      descricao:
        "Integração para sincronização inicial e periódica de servidores, lotações e dados funcionais.",
    },
  });
}

export async function buscarEquipamentoPorCodigo(codigo: string) {
  return prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo,
    },
    include: {
      orgao: true,
      unidade: true,
    },
  });
}

export async function buscarEquipamentoBiometricoPorId(id: string) {
  return prisma.equipamentoBiometrico.findUnique({
    where: {
      id,
    },
    include: {
      unidade: true,
    },
  });
}

export async function listarEquipamentosParaIdentificacaoAfd(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  return prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ...(params?.orgaoIdsPermitidos?.length
        ? {
            OR: [
              { orgaoId: { in: params.orgaoIdsPermitidos } },
              { unidade: { orgaoId: { in: params.orgaoIdsPermitidos } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      numeroSerie: true,
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
      unidade: {
        select: {
          sigla: true,
          nome: true,
        },
      },
    },
    orderBy: [{ nome: "asc" }, { codigo: "asc" }],
  });
}
