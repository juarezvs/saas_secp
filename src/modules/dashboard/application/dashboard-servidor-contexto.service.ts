import { prisma } from "@/shared/infrastructure/database/prisma";
import { FUSO_HORARIO_PADRAO } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";

type UnidadeCaminho = {
  id: string;
  sigla: string;
  unidadePaiId: string | null;
  fusoHorario?: string | null;
  orgao?: {
    sigla?: string | null;
    fusoHorario?: string | null;
  } | null;
};

export type DashboardServidorContexto = {
  dataExtenso: string;
  horaReferencia: string;
  fusoHorario: string;
  unidade: string;
};

function capitalizarPrimeiraLetra(valor: string) {
  return valor.charAt(0).toLocaleUpperCase("pt-BR") + valor.slice(1);
}

function formatarDataExtenso(referencia: Date, fusoHorario = FUSO_HORARIO_PADRAO) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: fusoHorario,
  }).format(referencia);

  return capitalizarPrimeiraLetra(data);
}

function formatarHoraReferencia(
  referencia: Date,
  fusoHorario = FUSO_HORARIO_PADRAO,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario,
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
        fusoHorario: true,
        orgao: {
          select: {
            fusoHorario: true,
          },
        },
      },
    });
  }

  return caminho;
}

function montarUnidadeComPais(unidades: UnidadeCaminho[]) {
  let unidadeComPai: (UnidadeCaminho & {
    unidadePai?: UnidadeCaminho | null;
  }) | null = null;

  for (const unidade of unidades) {
    unidadeComPai = {
      ...unidade,
      unidadePai: unidadeComPai,
    };
  }

  return unidadeComPai;
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
              fusoHorario: true,
              orgao: {
                select: {
                  sigla: true,
                  fusoHorario: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const unidadeAtual = servidor?.lotacoes[0]?.unidade;
  const caminhoUnidade = unidadeAtual ? await buscarCaminhoUnidade(unidadeAtual) : [];
  const fusoHorario = resolverFusoHorarioUnidade(
    montarUnidadeComPais(caminhoUnidade) ?? unidadeAtual,
  );
  const contextoBase = {
    dataExtenso: formatarDataExtenso(referencia, fusoHorario),
    horaReferencia: formatarHoraReferencia(referencia, fusoHorario),
    fusoHorario,
    unidade: "Lotacao nao informada",
  };

  if (!unidadeAtual) {
    return contextoBase;
  }

  return {
    ...contextoBase,
    unidade: montarArvoreLotacao(
      servidor?.orgao.sigla ?? unidadeAtual.orgao.sigla,
      caminhoUnidade,
    ),
  };
}
