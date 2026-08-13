import type { OvertimeDayType } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

import type {
  RemuneracaoProvider,
  VigenciaRemuneratoriaComSnapshot,
} from "../integrations/remuneracao-provider";
import { calcularValorHorasExtras } from "./calcular-valor-horas-extras.service";
import { rubricaHorasExtrasPorPercentual } from "./horas-extras-folha.service";

type ClassificacaoReconhecida = {
  id: string;
  servidorAutorizadoId: string;
  data: Date;
  inicio: string;
  fim: string;
  minutos: number;
  metadados: unknown;
};

type ServidorCalculo = {
  id: string;
  servidorId: string;
  classificacoes: ClassificacaoReconhecida[];
};

function dataIso(data: Date) {
  return data.toISOString().slice(0, 10);
}

function dataUtc(data: string) {
  return new Date(`${data}T00:00:00.000Z`);
}

function tipoDiaDaClassificacao(
  classificacao: ClassificacaoReconhecida,
): OvertimeDayType {
  const metadados = classificacao.metadados;

  if (
    metadados &&
    typeof metadados === "object" &&
    "tipoDia" in metadados &&
    typeof metadados.tipoDia === "string"
  ) {
    return metadados.tipoDia as OvertimeDayType;
  }

  return "DIA_UTIL";
}

async function obterPoliticaFinanceira(params: {
  orgaoId: string;
  unidadeId: string;
  competencia: string;
}) {
  const referencia = dataUtc(`${params.competencia}-01`);
  const whereVigente = {
    orgaoId: params.orgaoId,
    active: true,
    validFrom: {
      lte: referencia,
    },
    OR: [
      {
        validUntil: null,
      },
      {
        validUntil: {
          gte: referencia,
        },
      },
    ],
  };
  const versaoUnidade = await prisma.overtimePolicyVersion.findFirst({
    where: {
      ...whereVigente,
      scopeUnitId: params.unidadeId,
    },
    orderBy: [{ validFrom: "desc" }, { version: "desc" }],
  });
  const versaoGlobal = versaoUnidade
    ? null
    : await prisma.overtimePolicyVersion.findFirst({
        where: {
          ...whereVigente,
          scopeUnitId: null,
        },
        orderBy: [{ validFrom: "desc" }, { version: "desc" }],
      });
  const versao = versaoUnidade ?? versaoGlobal;

  if (!versao) {
    throw new Error(
      `Politica financeira de horas extras nao encontrada para ${params.competencia}.`,
    );
  }

  const rateRules = await prisma.overtimeRateRule.findMany({
    where: {
      policyVersionId: versao.id,
      active: true,
    },
  });

  if (rateRules.length === 0) {
    throw new Error(
      `Politica financeira de horas extras sem regras de percentual para ${params.competencia}.`,
    );
  }

  return {
    ...versao,
    rateRules,
  };
}

export async function calcularAutorizacaoHorasExtras(params: {
  autorizacaoId: string;
  usuarioId?: string | null;
  perfilAtivoCodigo?: string | null;
  remuneracaoProvider: RemuneracaoProvider;
}) {
  const autorizacao = await prisma.autorizacaoHoraExtraAdministrativa.findUnique({
    where: {
      id: params.autorizacaoId,
    },
    include: {
      servidores: {
        include: {
          classificacoes: {
            where: {
              categoria: "HORA_EXTRA_RECONHECIDA",
            },
            orderBy: [{ data: "asc" }, { inicio: "asc" }],
          },
        },
      },
    },
  });

  if (!autorizacao) {
    throw new Error("Autorizacao de horas extras nao localizada.");
  }

  if (autorizacao.status !== "ATESTADA") {
    throw new Error("Somente autorizacoes atestadas podem ser calculadas.");
  }

  const calculosExistentes = await prisma.horaExtraCalculo.count({
    where: {
      autorizacaoId: autorizacao.id,
      status: "CALCULADO",
    },
  });

  if (calculosExistentes > 0) {
    throw new Error(
      "A autorizacao ja possui calculo financeiro. Use o fluxo de recalculo controlado.",
    );
  }

  const politica = await obterPoliticaFinanceira({
    orgaoId: autorizacao.orgaoId,
    unidadeId: autorizacao.unidadeId,
    competencia: autorizacao.mesReferencia,
  });

  const regrasFinanceiras = politica.rateRules.map((regra) => ({
    tipoDia: regra.dayType,
    percentual: Number(regra.ratePercent),
    rubrica: rubricaHorasExtrasPorPercentual(regra.ratePercent),
  }));
  const servidoresComHoras = autorizacao.servidores.filter(
    (servidor) => servidor.classificacoes.length > 0,
  );
  const remuneracoesPorServidor = new Map<
    string,
    VigenciaRemuneratoriaComSnapshot[]
  >();

  for (const servidor of servidoresComHoras) {
    const vigencias =
      await params.remuneracaoProvider.obterVigenciasRemuneratorias({
        orgaoId: autorizacao.orgaoId,
        servidorId: servidor.servidorId,
        competencia: autorizacao.mesReferencia,
      });

    remuneracoesPorServidor.set(servidor.id, vigencias);
  }

  const calculosServidores = servidoresComHoras.map((servidor) => {
    const vigencias = remuneracoesPorServidor.get(servidor.id) ?? [];
    const horasReconhecidas = servidor.classificacoes.map((classificacao) => ({
      data: dataIso(classificacao.data),
      minutos: classificacao.minutos,
      tipoDia: tipoDiaDaClassificacao(classificacao),
    }));
    const resultado = calcularValorHorasExtras({
      horasReconhecidas,
      vigenciasRemuneratorias: vigencias,
      regrasFinanceiras,
      divisorMinutos: politica.divisorMinutes,
    });

    return {
      servidor,
      vigencias,
      resultado,
    };
  });
  const totalMinutos = calculosServidores.reduce(
    (total, calculo) =>
      total +
      calculo.resultado.itens.reduce(
        (subtotal, item) => subtotal + item.minutos,
        0,
      ),
    0,
  );
  const totalValorCentavos = calculosServidores.reduce(
    (total, calculo) => total + calculo.resultado.totalCentavos,
    0,
  );

  return prisma.$transaction(async (tx) => {
    const calculo = await tx.horaExtraCalculo.create({
      data: {
        autorizacaoId: autorizacao.id,
        calculadoPorUsuarioId: params.usuarioId ?? null,
        competencia: autorizacao.mesReferencia,
        status: "CALCULADO",
        totalServidores: servidoresComHoras.length,
        totalMinutos,
        totalValorCentavos,
        divisorMinutos: politica.divisorMinutes,
        politicaVersaoId: politica.id,
        memoriaCalculo: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
          politica: {
            id: politica.id,
            version: politica.version,
            validFrom: dataIso(politica.validFrom),
            validUntil: politica.validUntil
              ? dataIso(politica.validUntil)
              : null,
            divisorMinutes: politica.divisorMinutes,
          },
          regrasFinanceiras,
        },
      },
    });

    for (const calculoServidor of calculosServidores) {
      await tx.horaExtraRemuneracaoSnapshot.createMany({
        data: calculoServidor.vigencias.map((vigencia) => ({
          calculoId: calculo.id,
          servidorAutorizadoId: calculoServidor.servidor.id,
          vigenciaId: vigencia.id,
          inicio: dataUtc(vigencia.inicio),
          fim: vigencia.fim ? dataUtc(vigencia.fim) : null,
          remuneracaoBaseCentavos: vigencia.remuneracaoBaseCentavos,
          origem: vigencia.origem,
          fonteDocumento: vigencia.fonteDocumento ?? null,
          consultadoEm: vigencia.consultadoEm ?? null,
          payload: vigencia.payload ?? undefined,
        })),
      });

      const classificacoesPorData = new Map<string, ClassificacaoReconhecida[]>();

      for (const classificacao of calculoServidor.servidor.classificacoes) {
        const chave = `${dataIso(classificacao.data)}:${classificacao.minutos}:${tipoDiaDaClassificacao(classificacao)}`;
        const fila = classificacoesPorData.get(chave) ?? [];

        fila.push(classificacao);
        classificacoesPorData.set(chave, fila);
      }

      await tx.horaExtraCalculoItem.createMany({
        data: calculoServidor.resultado.itens.map((item) => {
          const chave = `${item.data}:${item.minutos}:${item.tipoDia}`;
          const fila = classificacoesPorData.get(chave) ?? [];
          const classificacao = fila.shift();

          if (!classificacao) {
            throw new Error(
              `Classificacao reconhecida nao localizada para calculo em ${item.data}.`,
            );
          }

          classificacoesPorData.set(chave, fila);

          return {
            calculoId: calculo.id,
            servidorAutorizadoId: calculoServidor.servidor.id,
            classificacaoIntervaloId: classificacao.id,
            data: dataUtc(item.data),
            inicio: classificacao.inicio,
            fim: classificacao.fim,
            minutos: item.minutos,
            tipoDia: item.tipoDia as OvertimeDayType,
            vigenciaRemuneratoriaId: item.vigenciaRemuneratoriaId,
            remuneracaoBaseCentavos: item.remuneracaoBaseCentavos,
            divisorMinutos: item.divisorMinutos,
            percentual: item.percentual,
            rubrica: item.rubrica ?? null,
            valorCentavos: item.valorCentavos,
            memoriaCalculo: {
              formula:
                "(remuneracaoBaseCentavos / divisorMinutos) * minutos * (1 + percentual / 100)",
            },
          };
        }),
      });

      await tx.autorizacaoHoraExtraServidor.update({
        where: {
          id: calculoServidor.servidor.id,
        },
        data: {
          status: "CALCULADO",
        },
      });
    }

    await tx.autorizacaoHoraExtraAdministrativa.update({
      where: {
        id: autorizacao.id,
      },
      data: {
        status: "CALCULADA",
      },
    });

    await tx.horaExtraEvento.create({
      data: {
        autorizacaoId: autorizacao.id,
        usuarioId: params.usuarioId ?? null,
        acao: "CALCULO_FINANCEIRO_REALIZADO",
        dadosDepois: {
          calculoId: calculo.id,
          totalServidores: servidoresComHoras.length,
          totalMinutos,
          totalValorCentavos,
        },
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
          origemRemuneracao: "CONTRACHEQUE_SARH",
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        entidade: "HoraExtraCalculo",
        entidadeId: calculo.id,
        acao: "HORAS_EXTRAS_CALCULO_FINANCEIRO_REALIZADO",
        dadosDepois: {
          autorizacaoId: autorizacao.id,
          totalServidores: servidoresComHoras.length,
          totalMinutos,
          totalValorCentavos,
        },
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
          origemRemuneracao: "CONTRACHEQUE_SARH",
        },
      },
    });

    return {
      id: calculo.id,
      totalServidores: servidoresComHoras.length,
      totalMinutos,
      totalValorCentavos,
    };
  });
}
