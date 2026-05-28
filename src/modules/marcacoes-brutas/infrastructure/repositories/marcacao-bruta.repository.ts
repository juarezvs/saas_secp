import { prisma } from "@/shared/infrastructure/database/prisma";

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

export async function listarMarcacoesBrutas(params?: {
  limite?: number;
  processada?: string;
  origem?: string;
  busca?: string;
}) {
  const busca = params?.busca?.trim();

  return prisma.marcacaoBruta.findMany({
    where: {
      ...(params?.processada === "true"
        ? { processada: true }
        : params?.processada === "false"
          ? { processada: false }
          : {}),
      ...(params?.origem ? { origem: params.origem as never } : {}),
      ...(busca
        ? {
            OR: [
              { cpf: { contains: busca } },
              { matricula: { contains: busca } },
              { equipamentoCodigo: { contains: busca } },
              { nsr: { contains: busca } },
              { codigoExterno: { contains: busca } },
            ],
          }
        : {}),
    },
    include: {
      servidor: {
        include: {
          usuario: true,
        },
      },
      marcacao: true,
    },
    orderBy: {
      dataHora: "desc",
    },
    take: params?.limite ?? 100,
  });
}
