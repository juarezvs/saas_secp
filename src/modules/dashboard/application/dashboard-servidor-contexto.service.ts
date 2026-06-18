import { prisma } from "@/shared/infrastructure/database/prisma";

const TIME_ZONE_MANAUS = "America/Manaus";

type UnidadeCaminho = {
  id: string;
  sigla: string;
  unidadePaiId: string | null;
};

export type DashboardServidorContexto = {
  dataExtenso: string;
  horaReferencia: string;
  unidade: string;
};

function capitalizarPrimeiraLetra(valor: string) {
  return valor.charAt(0).toLocaleUpperCase("pt-BR") + valor.slice(1);
}

function formatarDataExtenso(referencia: Date) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE_MANAUS,
  }).format(referencia);

  return capitalizarPrimeiraLetra(data);
}

function formatarHoraReferencia(referencia: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE_MANAUS,
  }).format(referencia);
}

async function buscarCaminhoUnidade(unidadeInicial: UnidadeCaminho) {
  const caminho: UnidadeCaminho[] = [];
  const unidadesVisitadas = new Set<string>();
  let unidadeAtual: UnidadeCaminho | null = unidadeInicial;

  while (unidadeAtual && !unidadesVisitadas.has(unidadeAtual.id)) {
    caminho.unshift(unidadeAtual);
    unidadesVisitadas.add(unidadeAtual.id);

    if (!unidadeAtual.unidadePaiId) {
      break;
    }

    unidadeAtual = await prisma.unidadeOrganizacional.findUnique({
      where: {
        id: unidadeAtual.unidadePaiId,
      },
      select: {
        id: true,
        sigla: true,
        unidadePaiId: true,
      },
    });
  }

  return caminho;
}

function montarArvoreLotacao(
  orgaoSigla: string | null | undefined,
  unidades: UnidadeCaminho[],
) {
  const partes: string[] = [];
  const siglasHierarquia = unidades.length > 0
    ? unidades.map((unidade) => unidade.sigla)
    : [orgaoSigla];

  for (const sigla of siglasHierarquia) {
    const valor = sigla?.trim();

    if (!valor || partes.at(-1) === valor) {
      continue;
    }

    partes.push(valor);
  }

  return partes.join(" > ") || "Lotacao nao informada";
}

export async function buscarContextoDashboardServidor(
  usuarioId: string,
  referencia = new Date(),
): Promise<DashboardServidorContexto> {
  const contextoBase = {
    dataExtenso: formatarDataExtenso(referencia),
    horaReferencia: formatarHoraReferencia(referencia),
    unidade: "Lotacao nao informada",
  };

  const servidor = await prisma.servidor.findUnique({
    where: {
      usuarioId,
    },
    select: {
      orgao: {
        select: {
          sigla: true,
        },
      },
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        orderBy: {
          dataInicio: "desc",
        },
        take: 1,
        select: {
          unidade: {
            select: {
              id: true,
              sigla: true,
              unidadePaiId: true,
              orgao: {
                select: {
                  sigla: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const unidadeAtual = servidor?.lotacoes[0]?.unidade;

  if (!unidadeAtual) {
    return contextoBase;
  }

  const caminhoUnidade = await buscarCaminhoUnidade(unidadeAtual);

  return {
    ...contextoBase,
    unidade: montarArvoreLotacao(
      servidor?.orgao.sigla ?? unidadeAtual.orgao.sigla,
      caminhoUnidade,
    ),
  };
}
