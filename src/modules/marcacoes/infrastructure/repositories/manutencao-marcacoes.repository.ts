import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export const PERMISSOES_MANUTENCAO_MARCACOES = [
  "marcacao:manutencao:seccional",
  "marcacao:manutencao:global",
];

export type PessoaManutencaoMarcacao = {
  id: string;
  nome: string;
  matricula: string;
  orgaoSigla: string;
  unidadeSigla?: string | null;
};

export type CelulaMarcacaoManutencao = {
  id: string;
  hora: string;
  tipo: string;
};

export type LinhaMarcacaoManutencao = {
  dataReferencia: string;
  dia: string;
  diaSemana: string;
  marcacoes: Array<CelulaMarcacaoManutencao | null>;
};

function whereEscopo(orgaoIdsPermitidos?: string[] | null) {
  if (!orgaoIdsPermitidos) {
    return {};
  }

  return {
    orgaoId: {
      in: orgaoIdsPermitidos,
    },
  };
}

function montarPessoa(
  servidor: Prisma.ServidorGetPayload<{
    include: {
      usuario: { select: { nome: true } };
      orgao: { select: { sigla: true } };
      lotacoes: {
        take: 1;
        include: {
          unidade: { select: { sigla: true } };
        };
      };
    };
  }>,
): PessoaManutencaoMarcacao {
  return {
    id: servidor.id,
    nome: nomeServidor(servidor),
    matricula: servidor.matricula,
    orgaoSigla: servidor.orgao.sigla,
    unidadeSigla: servidor.lotacoes[0]?.unidade.sigla ?? null,
  };
}

export async function pesquisarPessoasParaManutencaoMarcacoes(params: {
  termo: string;
  orgaoIdsPermitidos?: string[] | null;
  limite?: number;
}) {
  const termo = params.termo.trim();

  if (termo.length < 2) {
    return [];
  }

  const servidores = await prisma.servidor.findMany({
    take: params.limite ?? 20,
    where: {
      ativo: true,
      ...whereEscopo(params.orgaoIdsPermitidos),
      OR: [
        {
          matricula: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          nomeFuncional: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          nomeCompletoSarh: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          usuario: {
            nome: {
              contains: termo,
              mode: "insensitive",
            },
          },
        },
      ],
    },
    include: {
      usuario: {
        select: {
          nome: true,
        },
      },
      orgao: {
        select: {
          sigla: true,
        },
      },
      lotacoes: {
        take: 1,
        where: {
          status: "ATIVO",
        },
        orderBy: {
          dataInicio: "desc",
        },
        include: {
          unidade: {
            select: {
              sigla: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        usuario: {
          nome: "asc",
        },
      },
      {
        matricula: "asc",
      },
    ],
  });

  return servidores.map(montarPessoa);
}

export async function obterPessoaParaManutencaoMarcacoes(params: {
  servidorId: string;
  orgaoIdsPermitidos?: string[] | null;
}) {
  const servidor = await prisma.servidor.findFirst({
    where: {
      id: params.servidorId,
      ativo: true,
      ...whereEscopo(params.orgaoIdsPermitidos),
    },
    include: {
      usuario: {
        select: {
          nome: true,
        },
      },
      orgao: {
        select: {
          sigla: true,
        },
      },
      lotacoes: {
        take: 1,
        where: {
          status: "ATIVO",
        },
        orderBy: {
          dataInicio: "desc",
        },
        include: {
          unidade: {
            select: {
              sigla: true,
            },
          },
        },
      },
    },
  });

  return servidor ? montarPessoa(servidor) : null;
}

function formatarHoraLocal(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(data);
}

function rotuloDiaSemana(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(data)
    .replace(".", "")
    .replace(/^./, (letra) => letra.toUpperCase());
}

export async function montarGradeMarcacoesManutencao(params: {
  servidorId: string;
  competencia: string;
}) {
  const [ano, mes] = params.competencia.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const marcacoes = await prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: inicio,
        lt: fim,
      },
      status: {
        in: ["VALIDA", "PENDENTE", "AJUSTADA"],
      },
    },
    orderBy: [
      {
        dataReferencia: "asc",
      },
      {
        dataHora: "asc",
      },
    ],
    select: {
      id: true,
      dataHora: true,
      dataReferencia: true,
      fusoHorario: true,
      tipo: true,
    },
  });
  const marcacoesPorData = new Map<string, typeof marcacoes>();

  for (const marcacao of marcacoes) {
    const chave = marcacao.dataReferencia.toISOString().slice(0, 10);
    const lista = marcacoesPorData.get(chave) ?? [];
    lista.push(marcacao);
    marcacoesPorData.set(chave, lista);
  }

  return Array.from({ length: diasNoMes }, (_, indice) => {
    const data = new Date(Date.UTC(ano, mes - 1, indice + 1));
    const chave = data.toISOString().slice(0, 10);
    const marcacoesDia = marcacoesPorData.get(chave) ?? [];

    return {
      dataReferencia: chave,
      dia: String(indice + 1).padStart(2, "0"),
      diaSemana: rotuloDiaSemana(data),
      marcacoes: Array.from({ length: 6 }, (_item, coluna) => {
        const marcacao = marcacoesDia[coluna];

        if (!marcacao) {
          return null;
        }

        return {
          id: marcacao.id,
          hora: formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario),
          tipo: marcacao.tipo,
        };
      }),
    } satisfies LinhaMarcacaoManutencao;
  });
}
