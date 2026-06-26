import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularDiaServidorService } from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";
import { carregarCalendarioInstitucionalPeriodo } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
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

function hojeNoFuso(fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizarFusoHorario(fusoHorario),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function fimExclusivoRecalculo(params: {
  inicio: Date;
  fim: Date;
  fusoHorario?: string | null;
}) {
  const hoje = hojeNoFuso(params.fusoHorario);

  if (hoje < params.inicio) {
    return params.inicio;
  }

  if (hoje >= params.fim) {
    return params.fim;
  }

  const fimHoje = clonarData(hoje);
  fimHoje.setUTCDate(fimHoje.getUTCDate() + 1);
  return fimHoje;
}

async function removerApuracoesFuturasSemMarcacao(params: {
  servidorId: string;
  inicioExclusivo: Date;
  fim: Date;
}) {
  if (params.inicioExclusivo >= params.fim) {
    return 0;
  }

  const marcacoesFuturas = await prisma.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: params.inicioExclusivo,
        lt: params.fim,
      },
    },
    select: {
      dataReferencia: true,
    },
    distinct: ["dataReferencia"],
  });
  const datasComMarcacao = marcacoesFuturas.map(
    (marcacao) => marcacao.dataReferencia,
  );
  const resultado = await prisma.apuracaoDiaria.deleteMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: params.inicioExclusivo,
        lt: params.fim,
        ...(datasComMarcacao.length > 0 ? { notIn: datasComMarcacao } : {}),
      },
    },
  });

  return resultado.count;
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
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
    dataReferencia: inicio,
  });
  const fimRecalculo = fimExclusivoRecalculo({
    inicio,
    fim,
    fusoHorario,
  });
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
    const fimJornada = clonarData(fimRecalculo);

    if (jornada.dataFim && jornada.dataFim < fimJornada) {
      fimJornada.setTime(jornada.dataFim.getTime());
      fimJornada.setUTCDate(fimJornada.getUTCDate() + 1);
    }

    if (inicioJornada < fimJornada) {
      adicionarDatasNoIntervalo(datas, inicioJornada, fimJornada);
    }
  }

  for (const marcacao of marcacoes) {
    if (marcacao.dataReferencia < fimRecalculo) {
      datas.set(chaveData(marcacao.dataReferencia), marcacao.dataReferencia);
    }
  }

  for (const apuracao of apuracoesExistentes) {
    if (
      apuracao.dataReferencia < fimRecalculo &&
      quantidadeMarcacoesMetadados(apuracao.metadados) !== null
    ) {
      datas.set(chaveData(apuracao.dataReferencia), apuracao.dataReferencia);
    }
  }

  for (const solicitacao of solicitacoesDeferidas) {
    for (const dataImpactada of listarDatasImpactadasSolicitacao(
      solicitacao,
      fusoHorario,
    )) {
      if (dataImpactada >= inicio && dataImpactada < fimRecalculo) {
        datas.set(chaveData(dataImpactada), dataImpactada);
      }
    }
  }

  for (const dispensa of dispensasPonto) {
    const inicioDispensa =
      dispensa.dataInicio > inicio ? dispensa.dataInicio : inicio;
    const fimDispensa = clonarData(fimRecalculo);

    if (dispensa.dataFim && dispensa.dataFim < fimDispensa) {
      fimDispensa.setTime(dispensa.dataFim.getTime());
      fimDispensa.setUTCDate(fimDispensa.getUTCDate() + 1);
    }

    if (inicioDispensa < fimDispensa) {
      adicionarDatasNoIntervalo(datas, inicioDispensa, fimDispensa);
    }
  }

  if (datas.size === 0) {
    const apuracoesAutomaticasRemovidas =
      await removerApuracoesFuturasSemMarcacao({
        servidorId,
        inicioExclusivo: fimRecalculo,
        fim,
      });
    const bancoHoras = await regerarBancoHorasMesService({
      servidorId,
      anoReferencia,
      mesReferencia,
      usuarioIdAuditoria,
      origem,
    });

    return {
      diasRecalculados: 0,
      apuracoesAutomaticasRemovidas,
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
  const apuracoesAutomaticasRemovidas =
    await removerApuracoesFuturasSemMarcacao({
      servidorId,
      inicioExclusivo: fimRecalculo,
      fim,
    });

  return {
    diasRecalculados: resultadosDias.length,
    apuracoesAutomaticasRemovidas,
    bancoHoras,
  };
}
