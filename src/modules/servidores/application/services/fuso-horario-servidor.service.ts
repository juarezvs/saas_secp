import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  FUSO_HORARIO_PADRAO,
  normalizarFusoHorario,
} from "@/modules/marcacoes/application/services/data-marcacao.service";

type UnidadeComFuso = {
  fusoHorario?: string | null;
  codigo?: string | null;
  sigla?: string | null;
  nome?: string | null;
  orgao?: {
    fusoHorario?: string | null;
  } | null;
  unidadePai?: UnidadeComFuso | null;
};

type ServidorComLotacaoFuso = {
  lotacoes?: {
    unidade?: UnidadeComFuso | null;
  }[];
};

function unidadePareceTabatinga(unidade?: UnidadeComFuso | null): boolean {
  if (!unidade) {
    return false;
  }

  const texto = [
    unidade.codigo,
    unidade.sigla,
    unidade.nome,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleUpperCase("pt-BR");

  return (
    texto.includes("TABATINGA") ||
    texto.includes("SSJTBN") ||
    texto.includes("TBT")
  );
}

export function resolverFusoHorarioUnidade(
  unidade?: UnidadeComFuso | null,
): string {
  if (!unidade) {
    return FUSO_HORARIO_PADRAO;
  }

  if (unidade.fusoHorario) {
    return normalizarFusoHorario(unidade.fusoHorario);
  }

  if (unidade.unidadePai) {
    return resolverFusoHorarioUnidade(unidade.unidadePai);
  }

  if (unidadePareceTabatinga(unidade)) {
    return "America/Eirunepe";
  }

  if (unidade.orgao?.fusoHorario) {
    return normalizarFusoHorario(unidade.orgao.fusoHorario);
  }

  return FUSO_HORARIO_PADRAO;
}

export function resolverFusoHorarioServidor(
  servidor?: ServidorComLotacaoFuso | null,
) {
  return resolverFusoHorarioUnidade(servidor?.lotacoes?.[0]?.unidade);
}

export async function resolverFusoHorarioServidorNoBanco(params: {
  servidorId: string;
  dataReferencia?: Date;
}) {
  const dataReferencia = params.dataReferencia;

  const lotacao = await prisma.lotacao.findFirst({
    where: {
      servidorId: params.servidorId,
      status: "ATIVO",
      ...(dataReferencia
        ? {
            dataInicio: { lte: dataReferencia },
            OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
          }
        : {}),
    },
    include: {
      unidade: {
        include: {
          orgao: {
            select: {
              fusoHorario: true,
            },
          },
          unidadePai: {
            include: {
              orgao: {
                select: {
                  fusoHorario: true,
                },
              },
              unidadePai: {
                include: {
                  orgao: {
                    select: {
                      fusoHorario: true,
                    },
                  },
                  unidadePai: {
                    include: {
                      orgao: {
                        select: {
                          fusoHorario: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  return resolverFusoHorarioUnidade(lotacao?.unidade);
}
