import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularDiaServidorService } from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";

export type RecalcularMesServidorParams = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  usuarioIdAuditoria?: string;
  origem?: string;
};

function chaveData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function recalcularMesServidorService({
  servidorId,
  anoReferencia,
  mesReferencia,
  usuarioIdAuditoria,
  origem = "RECALCULO_MES_SERVIDOR",
}: RecalcularMesServidorParams) {
  const inicio = new Date(anoReferencia, mesReferencia - 1, 1);
  const fim = new Date(anoReferencia, mesReferencia, 1);

  /*
   * Nesta versão, recalculamos as datas que possuem:
   * - marcações;
   * - apurações já existentes.
   *
   * Ainda não geramos falta automática para todos os dias úteis do mês,
   * porque isso dependerá do módulo de calendário institucional,
   * feriados, recesso forense e expedientes.
   */
  const [marcacoes, apuracoesExistentes] = await Promise.all([
    prisma.marcacao.findMany({
      where: {
        servidorId,
        dataReferencia: {
          gte: inicio,
          lt: fim,
        },
      },
      select: {
        dataReferencia: true,
      },
      distinct: ["dataReferencia"],
    }),

    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId,
        dataReferencia: {
          gte: inicio,
          lt: fim,
        },
      },
      select: {
        dataReferencia: true,
      },
      distinct: ["dataReferencia"],
    }),
  ]);

  const datas = new Map<string, Date>();

  for (const marcacao of marcacoes) {
    datas.set(chaveData(marcacao.dataReferencia), marcacao.dataReferencia);
  }

  for (const apuracao of apuracoesExistentes) {
    datas.set(chaveData(apuracao.dataReferencia), apuracao.dataReferencia);
  }

  const resultadosDias = [];

  for (const dataReferencia of datas.values()) {
    const resultado = await recalcularDiaServidorService({
      servidorId,
      dataReferencia,
      usuarioIdAuditoria,
      origem,
    });

    resultadosDias.push(resultado);
  }

  const bancoHoras = await regerarBancoHorasMesService({
    servidorId,
    anoReferencia,
    mesReferencia,
    usuarioIdAuditoria,
    origem,
  });

  return {
    diasRecalculados: resultadosDias.length,
    bancoHoras,
  };
}
