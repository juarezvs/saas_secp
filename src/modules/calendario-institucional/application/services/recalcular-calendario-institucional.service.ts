import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type EscopoCalendario = {
  abrangencia: string;
  uf?: string | null;
  municipio?: string | null;
  municipioIbge?: string | null;
  orgaoId?: string | null;
  unidadeId?: string | null;
};

function chaveData(data: Date) {
  return normalizarDataReferencia(data).toISOString().slice(0, 10);
}

function competenciaDaData(dataReferencia: Date) {
  const data = normalizarDataReferencia(dataReferencia);

  return {
    ano: data.getUTCFullYear(),
    mes: data.getUTCMonth() + 1,
  };
}

async function listarServidoresImpactadosPelaData(dataReferencia: Date) {
  const data = normalizarDataReferencia(dataReferencia);

  const [jornadas, marcacoes, apuracoes] = await Promise.all([
    prisma.jornadaServidor.findMany({
      where: {
        ativo: true,
        servidor: {
          ativo: true,
          usuario: {
            ativo: true,
          },
        },
        dataInicio: {
          lte: data,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: data,
            },
          },
        ],
      },
      select: {
        servidorId: true,
      },
      distinct: ["servidorId"],
    }),
    prisma.marcacao.findMany({
      where: {
        dataReferencia: data,
        servidor: {
          ativo: true,
          usuario: {
            ativo: true,
          },
        },
      },
      select: {
        servidorId: true,
      },
      distinct: ["servidorId"],
    }),
    prisma.apuracaoDiaria.findMany({
      where: {
        dataReferencia: data,
        servidor: {
          ativo: true,
          usuario: {
            ativo: true,
          },
        },
      },
      select: {
        servidorId: true,
      },
      distinct: ["servidorId"],
    }),
  ]);

  return Array.from(
    new Set(
      [...jornadas, ...marcacoes, ...apuracoes].map((item) => item.servidorId),
    ),
  );
}

function normalizarTextoLocalidade(valor?: string | null) {
  return valor
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase() || null;
}

function escopoEventoServidor(evento: EscopoCalendario, servidor: {
  orgaoId: string;
  lotacoes: Array<{
    unidade: {
      id: string;
      uf?: string | null;
      municipio?: string | null;
      municipioIbge?: string | null;
      unidadePai?: {
        id: string;
        uf?: string | null;
        municipio?: string | null;
        municipioIbge?: string | null;
        unidadePai?: {
          id: string;
          uf?: string | null;
          municipio?: string | null;
          municipioIbge?: string | null;
        } | null;
      } | null;
    };
  }>;
}) {
  if (evento.abrangencia === "NACIONAL") {
    return true;
  }

  const unidade = servidor.lotacoes[0]?.unidade;
  const unidades = [
    unidade,
    unidade?.unidadePai,
    unidade?.unidadePai?.unidadePai,
  ].filter(Boolean);
  const uf =
    unidades.find((item) => item?.uf)?.uf?.trim().toUpperCase() ?? null;
  const municipio =
    normalizarTextoLocalidade(unidades.find((item) => item?.municipio)?.municipio);
  const municipioIbge =
    unidades.find((item) => item?.municipioIbge)?.municipioIbge?.trim() ?? null;
  const unidadeIds = unidades.map((item) => item!.id);

  if (evento.abrangencia === "ESTADUAL") {
    return Boolean(evento.uf && evento.uf.trim().toUpperCase() === uf);
  }

  if (evento.abrangencia === "MUNICIPAL") {
    const mesmoEstado = Boolean(evento.uf && evento.uf.trim().toUpperCase() === uf);
    const mesmoIbge = Boolean(
      evento.municipioIbge &&
        municipioIbge &&
        evento.municipioIbge.trim() === municipioIbge,
    );
    const mesmoMunicipio = Boolean(
      evento.municipio &&
        municipio &&
        normalizarTextoLocalidade(evento.municipio) === municipio,
    );

    return mesmoEstado && (mesmoIbge || mesmoMunicipio);
  }

  if (evento.abrangencia === "ORGAO") {
    return Boolean(evento.orgaoId && evento.orgaoId === servidor.orgaoId);
  }

  if (evento.abrangencia === "UNIDADE") {
    return Boolean(evento.unidadeId && unidadeIds.includes(evento.unidadeId));
  }

  return false;
}

async function filtrarServidoresPorEscopoCalendario(params: {
  servidorIds: string[];
  dataReferencia: Date;
  calendarioId?: string | null;
  calendarioEscopo?: EscopoCalendario | null;
}) {
  if ((!params.calendarioId && !params.calendarioEscopo) || params.servidorIds.length === 0) {
    return params.servidorIds;
  }

  const evento =
    params.calendarioEscopo ??
    (params.calendarioId
      ? await prisma.calendarioInstitucional.findUnique({
          where: {
            id: params.calendarioId,
          },
        })
      : null);

  if (!evento || evento.abrangencia === "NACIONAL") {
    return params.servidorIds;
  }

  const data = normalizarDataReferencia(params.dataReferencia);
  const servidores = await prisma.servidor.findMany({
    where: {
      id: {
        in: params.servidorIds,
      },
    },
    select: {
      id: true,
      orgaoId: true,
      lotacoes: {
        where: {
          status: "ATIVO",
          dataInicio: {
            lte: data,
          },
          OR: [{ dataFim: null }, { dataFim: { gte: data } }],
        },
        orderBy: {
          dataInicio: "desc",
        },
        take: 1,
        select: {
          unidade: {
            select: {
              id: true,
              uf: true,
              municipio: true,
              municipioIbge: true,
              unidadePai: {
                select: {
                  id: true,
                  uf: true,
                  municipio: true,
                  municipioIbge: true,
                  unidadePai: {
                    select: {
                      id: true,
                      uf: true,
                      municipio: true,
                      municipioIbge: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return servidores
    .filter((servidor) => escopoEventoServidor(evento, servidor))
    .map((servidor) => servidor.id);
}

export async function recalcularReflexosCalendarioInstitucional(params: {
  calendarioId?: string | null;
  calendarioEscopo?: EscopoCalendario | null;
  datasReferencia: Date[];
  usuarioIdAuditoria?: string;
  atualizarProgresso?: (progresso: {
    percentual: number;
    etapa: string;
    datasProcessadas: number;
    totalDatas: number;
    servidoresImpactados: number;
  }) => Promise<void> | void;
}) {
  const datas = Array.from(
    new Map(
      params.datasReferencia.map((data) => [
        chaveData(data),
        normalizarDataReferencia(data),
      ]),
    ).values(),
  );

  const resultados: {
    dataReferencia: Date;
    servidoresImpactados: number;
    competencias: string[];
  }[] = [];
  let datasProcessadas = 0;
  let servidoresImpactadosTotal = 0;

  for (const dataReferencia of datas) {
    const servidorIds = await filtrarServidoresPorEscopoCalendario({
      servidorIds: await listarServidoresImpactadosPelaData(dataReferencia),
      dataReferencia,
      calendarioId: params.calendarioId,
      calendarioEscopo: params.calendarioEscopo,
    });
    const competencias = new Set<string>();
    servidoresImpactadosTotal += servidorIds.length;

    await params.atualizarProgresso?.({
      percentual: Math.round((datasProcessadas / datas.length) * 100),
      etapa: `Recalculando ${dataReferencia.toISOString().slice(0, 10)}`,
      datasProcessadas,
      totalDatas: datas.length,
      servidoresImpactados: servidoresImpactadosTotal,
    });

    for (const servidorId of servidorIds) {
      const competencia = competenciaDaData(dataReferencia);
      competencias.add(
        `${competencia.ano}-${String(competencia.mes).padStart(2, "0")}`,
      );

      await recalcularDiaEBancoHorasServidorService({
        servidorId,
        dataReferencia,
        usuarioIdAuditoria: params.usuarioIdAuditoria,
        origem: "RECALCULO_CALENDARIO_INSTITUCIONAL",
        ignorarBloqueioHomologacao: true,
      });
    }

    resultados.push({
      dataReferencia,
      servidoresImpactados: servidorIds.length,
      competencias: Array.from(competencias),
    });
    datasProcessadas += 1;

    await params.atualizarProgresso?.({
      percentual: Math.round((datasProcessadas / datas.length) * 100),
      etapa:
        datasProcessadas === datas.length
          ? "Reflexos do calendario concluidos"
          : "Aguardando proxima data",
      datasProcessadas,
      totalDatas: datas.length,
      servidoresImpactados: servidoresImpactadosTotal,
    });
  }

  return resultados;
}
