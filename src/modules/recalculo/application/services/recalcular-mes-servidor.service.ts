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

export async function recalcularMesServidorService({
  servidorId,
  anoReferencia,
  mesReferencia,
  usuarioIdAuditoria,
  origem = "RECALCULO_MES_SERVIDOR",
}: RecalcularMesServidorParams) {
  const inicio = new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
  const fim = new Date(Date.UTC(anoReferencia, mesReferencia, 1));

  /*
   * Sem um calendario institucional completo, o recalculo mensal considera
   * somente datas com marcacoes ou apuracoes legitimas ja existentes.
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
        id: true,
        dataReferencia: true,
        resultado: true,
        metadados: true,
        movimentoBancoHoras: {
          select: {
            status: true,
          },
        },
      },
    }),
  ]);

  const datas = new Map<string, Date>();

  for (const marcacao of marcacoes) {
    datas.set(chaveData(marcacao.dataReferencia), marcacao.dataReferencia);
  }

  const apuracoesAutomaticasSemMarcacao = apuracoesExistentes.filter(
    (apuracao) =>
      !datas.has(chaveData(apuracao.dataReferencia)) &&
      apuracao.resultado === "FALTA" &&
      quantidadeMarcacoesMetadados(apuracao.metadados) === 0 &&
      apuracao.movimentoBancoHoras.every(
        (movimento) => movimento.status !== "VALIDADO",
      ),
  );
  const idsAutomaticos = new Set(
    apuracoesAutomaticasSemMarcacao.map((apuracao) => apuracao.id),
  );

  if (idsAutomaticos.size > 0) {
    const ids = [...idsAutomaticos];

    await prisma.$transaction([
      prisma.movimentoBancoHoras.deleteMany({
        where: {
          apuracaoDiariaId: { in: ids },
          status: { in: ["PENDENTE", "DESCONSIDERADO"] },
        },
      }),
      prisma.ocorrenciaFrequencia.deleteMany({
        where: { apuracaoDiariaId: { in: ids } },
      }),
      prisma.apuracaoDiaria.deleteMany({
        where: { id: { in: ids } },
      }),
    ]);
  }

  for (const apuracao of apuracoesExistentes) {
    if (!idsAutomaticos.has(apuracao.id)) {
      datas.set(chaveData(apuracao.dataReferencia), apuracao.dataReferencia);
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
    apuracoesAutomaticasRemovidas: idsAutomaticos.size,
    bancoHoras,
  };
}
