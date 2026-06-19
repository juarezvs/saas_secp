import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularDiaServidorService } from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";
import { carregarCalendarioInstitucionalPeriodo } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import {
  listarDatasImpactadasSolicitacao,
  TIPOS_SOLICITACAO_COM_EFEITO_APURACAO,
} from "@/modules/solicitacoes/application/services/periodo-solicitacao.service";

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

function quantidadeMarcacoesMetadados(metadados: unknown) {
  if (
    typeof metadados !== "object" ||
    metadados === null ||
    !("quantidadeMarcacoes" in metadados)
  ) {
    return null;
  }

  return Number(metadados.quantidadeMarcacoes);
}

function clonarData(data: Date) {
  return new Date(data.getTime());
}

function adicionarDatasNoIntervalo(
  datas: Map<string, Date>,
  inicio: Date,
  fimExclusivo: Date,
) {
  const cursor = clonarData(inicio);

  while (cursor < fimExclusivo) {
    datas.set(chaveData(cursor), clonarData(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export async function recalcularMesServidorService({
  servidorId,
  anoReferencia,
  mesReferencia,
  usuarioIdAuditoria,
  origem = "RECALCULO_MES_SERVIDOR",
}: RecalcularMesServidorParams) {
  const inicio = new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
  const fim = new Date(Date.UTC(anoReferencia, mesReferencia, 1));
  const [
    marcacoes,
    apuracoesExistentes,
    solicitacoesDeferidas,
    dispensasPonto,
    jornadasVigentes,
    calendario,
  ] = await Promise.all([
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
        metadados: true,
      },
    }),
    prisma.solicitacao.findMany({
      where: {
        servidorId,
        status: "DEFERIDA",
        tipo: {
          in: [...TIPOS_SOLICITACAO_COM_EFEITO_APURACAO],
        },
        OR: [
          {
            dataReferencia: {
              gte: inicio,
              lt: fim,
            },
          },
          {
            dataInicio: {
              lt: fim,
            },
            dataFim: {
              gte: inicio,
            },
          },
        ],
      },
      select: {
        dataReferencia: true,
        dataInicio: true,
        dataFim: true,
      },
    }),
    prisma.dispensaPontoServidor.findMany({
      where: {
        servidorId,
        dataInicio: {
          lt: fim,
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
    prisma.jornadaServidor.findMany({
      where: {
        servidorId,
        ativo: true,
        dataInicio: {
          lt: fim,
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
      orderBy: [{ dataInicio: "asc" }],
    }),
    carregarCalendarioInstitucionalPeriodo({
      inicio,
      fimExclusivo: fim,
    }),
  ]);

  const datas = new Map<string, Date>();

  for (const jornada of jornadasVigentes) {
    const inicioJornada =
      jornada.dataInicio > inicio ? jornada.dataInicio : inicio;
    const fimJornada = clonarData(fim);

    if (jornada.dataFim && jornada.dataFim < fimJornada) {
      fimJornada.setTime(jornada.dataFim.getTime());
      fimJornada.setUTCDate(fimJornada.getUTCDate() + 1);
    }

    if (inicioJornada < fimJornada) {
      adicionarDatasNoIntervalo(datas, inicioJornada, fimJornada);
    }
  }

  for (const marcacao of marcacoes) {
    datas.set(chaveData(marcacao.dataReferencia), marcacao.dataReferencia);
  }

  for (const apuracao of apuracoesExistentes) {
    if (quantidadeMarcacoesMetadados(apuracao.metadados) !== null) {
      datas.set(chaveData(apuracao.dataReferencia), apuracao.dataReferencia);
    }
  }

  for (const solicitacao of solicitacoesDeferidas) {
    for (const dataImpactada of listarDatasImpactadasSolicitacao(solicitacao)) {
      if (dataImpactada >= inicio && dataImpactada < fim) {
        datas.set(chaveData(dataImpactada), dataImpactada);
      }
    }
  }

  for (const dispensa of dispensasPonto) {
    const inicioDispensa =
      dispensa.dataInicio > inicio ? dispensa.dataInicio : inicio;
    const fimDispensa = clonarData(fim);

    if (dispensa.dataFim && dispensa.dataFim < fimDispensa) {
      fimDispensa.setTime(dispensa.dataFim.getTime());
      fimDispensa.setUTCDate(fimDispensa.getUTCDate() + 1);
    }

    if (inicioDispensa < fimDispensa) {
      adicionarDatasNoIntervalo(datas, inicioDispensa, fimDispensa);
    }
  }

  if (datas.size === 0) {
    const bancoHoras = await regerarBancoHorasMesService({
      servidorId,
      anoReferencia,
      mesReferencia,
      usuarioIdAuditoria,
      origem,
    });

    return {
      diasRecalculados: 0,
      apuracoesAutomaticasRemovidas: 0,
      bancoHoras,
    };
  }

  const resultadosDias = [];

  for (const dataReferencia of [...datas.values()].sort((a, b) => a.getTime() - b.getTime())) {
    const resultado = await recalcularDiaServidorService({
      servidorId,
      dataReferencia,
      usuarioIdAuditoria,
      origem,
      calendario,
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
    apuracoesAutomaticasRemovidas: 0,
    bancoHoras,
  };
}
