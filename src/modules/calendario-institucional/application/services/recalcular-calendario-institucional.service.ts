import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

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

export async function recalcularReflexosCalendarioInstitucional(params: {
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
    const servidorIds = await listarServidoresImpactadosPelaData(dataReferencia);
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
