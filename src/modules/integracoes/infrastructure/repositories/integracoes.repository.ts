import { prisma } from "@/shared/infrastructure/database/prisma";

export async function listarIntegracoesSistema() {
  return prisma.integracaoSistema.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      _count: {
        select: {
          logs: true,
          equipamentos: true,
        },
      },
    },
  });
}

export async function listarEquipamentosBiometricos() {
  return prisma.equipamentoBiometrico.findMany({
    orderBy: {
      nome: "asc",
    },
    include: {
      unidade: true,
      integracao: true,
      _count: {
        select: {
          eventos: true,
        },
      },
    },
  });
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

export async function listarUnidadesParaEquipamentos() {
  return prisma.unidadeOrganizacional.findMany({
    where: {
      ativo: true,
    },
    orderBy: [
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
    },
  });
}

export async function buscarOuCriarIntegracaoSarh() {
  return prisma.integracaoSistema.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000101",
    },
    update: {
      nome: "SARH",
      tipo: "SARH",
      direcao: "ENTRADA",
      baseUrl: process.env.SARH_API_BASE_URL || null,
      status: process.env.SARH_API_BASE_URL ? "ATIVA" : "NAO_CONFIGURADA",
      ativo: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      nome: "SARH",
      tipo: "SARH",
      direcao: "ENTRADA",
      baseUrl: process.env.SARH_API_BASE_URL || null,
      status: process.env.SARH_API_BASE_URL ? "ATIVA" : "NAO_CONFIGURADA",
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
      unidade: true,
    },
  });
}
