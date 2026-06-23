import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterDataReferencia } from "../../application/services/data-marcacao.service";

export async function buscarServidorPorUsuarioId(usuarioId: string) {
  return prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      jornadas: {
        where: {
          ativo: true,
          dataFim: null,
        },
        include: {
          jornada: true,
          escala: {
            include: {
              dias: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
      biometriaFacialServidor: true,
    },
  });
}

export async function listarMarcacoesDoServidorNoDia(params: {
  servidorId: string;
  dataHora: Date;
}) {
  const dataReferencia = obterDataReferencia(params.dataHora);

  return prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia,
      status: {
        in: ["VALIDA", "PENDENTE"],
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });
}

export async function listarMarcacoesDoUsuarioNoDia(usuarioId: string) {
  const agora = new Date();
  const servidor = await buscarServidorPorUsuarioId(usuarioId);

  if (!servidor) {
    return {
      servidor: null,
      marcacoes: [],
    };
  }

  const marcacoes = await listarMarcacoesDoServidorNoDia({
    servidorId: servidor.id,
    dataHora: agora,
  });

  return {
    servidor,
    marcacoes,
  };
}

export async function listarUltimasMarcacoes(params?: {
  limite?: number;
  servidorId?: string | null;
}) {
  return prisma.marcacao.findMany({
    take: params?.limite ?? 50,
    where: {
      ...(params?.servidorId ? { servidorId: params.servidorId } : {}),
    },
    orderBy: {
      dataHora: "desc",
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              unidade: true,
            },
            orderBy: {
              dataInicio: "desc",
            },
          },
        },
      },
    },
  });
}

export async function listarServidoresParaFiltroMarcacoes() {
  return prisma.servidor.findMany({
    where: {
      ativo: true,
    },
    orderBy: [{ nomeFuncional: "asc" }, { matricula: "asc" }],
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      usuario: {
        select: {
          nome: true,
        },
      },
    },
  });
}
