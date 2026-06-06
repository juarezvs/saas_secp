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

function normalizarData(data: Date) {
  const normalizada = new Date(data);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}

function isFimDeSemana(data: Date) {
  const dia = data.getDay();
  return dia === 0 || dia === 6;
}

function isPeriodoRecessoForenseOrdinario(data: Date) {
  const mes = data.getMonth() + 1;
  const dia = data.getDate();

  return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 6);
}

function calcularLimiteFimRecalculo(anoReferencia: number, mesReferencia: number) {
  const fim = new Date(anoReferencia, mesReferencia, 1);
  const hoje = normalizarData(new Date());
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const mesFuturo =
    anoReferencia > anoAtual ||
    (anoReferencia === anoAtual && mesReferencia > mesAtual);
  const mesAtualSelecionado =
    anoReferencia === anoAtual && mesReferencia === mesAtual;

  if (mesFuturo) {
    return new Date(anoReferencia, mesReferencia - 1, 1);
  }

  return mesAtualSelecionado && hoje < fim ? hoje : fim;
}

function dataEstaNoVinculoJornada(
  data: Date,
  jornadaServidor: {
    dataInicio: Date;
    dataFim: Date | null;
  },
) {
  return (
    jornadaServidor.dataInicio <= data &&
    (!jornadaServidor.dataFim || jornadaServidor.dataFim >= data)
  );
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
  const limiteFim = calcularLimiteFimRecalculo(anoReferencia, mesReferencia);

  /*
   * Nesta versão, recalculamos as datas que possuem:
   * - marcações;
   * - apurações já existentes.
   *
   * Ainda não geramos falta automática para todos os dias úteis do mês,
   * porque isso dependerá do módulo de calendário institucional,
   * feriados, recesso forense e expedientes.
   */
  const [marcacoes, apuracoesExistentes, jornadasServidor] = await Promise.all([
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

    prisma.jornadaServidor.findMany({
      where: {
        servidorId,
        ativo: true,
        dataInicio: {
          lt: limiteFim,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: inicio,
            },
          },
        ],
      },
      select: {
        dataInicio: true,
        dataFim: true,
      },
    }),
  ]);

  const datas = new Map<string, Date>();

  for (const marcacao of marcacoes) {
    datas.set(chaveData(marcacao.dataReferencia), marcacao.dataReferencia);
  }

  for (const apuracao of apuracoesExistentes) {
    datas.set(chaveData(apuracao.dataReferencia), apuracao.dataReferencia);
  }

  for (
    let cursor = new Date(inicio);
    cursor < limiteFim;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dataReferencia = normalizarData(cursor);

    if (isFimDeSemana(dataReferencia)) {
      continue;
    }

    if (isPeriodoRecessoForenseOrdinario(dataReferencia)) {
      continue;
    }

    const possuiJornadaVigente = jornadasServidor.some((jornadaServidor) =>
      dataEstaNoVinculoJornada(dataReferencia, jornadaServidor),
    );

    if (possuiJornadaVigente) {
      datas.set(chaveData(dataReferencia), dataReferencia);
    }
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
