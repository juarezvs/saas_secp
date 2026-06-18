import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { recalcularDiaServidorService } from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";
import {
  listarDatasImpactadasSolicitacao,
  TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO,
} from "@/modules/solicitacoes/application/services/periodo-solicitacao.service";

export type RecalcularPosSolicitacaoParams = {
  solicitacaoId: string;
  usuarioIdAuditoria: string;
};

function obterDataImpactada(solicitacao: {
  dataReferencia: Date | null;
  dataInicio: Date | null;
  criadoEm: Date;
}) {
  if (solicitacao.dataReferencia) {
    return normalizarDataReferencia(solicitacao.dataReferencia);
  }

  if (solicitacao.dataInicio) {
    return normalizarDataReferencia(solicitacao.dataInicio);
  }

  return normalizarDataReferencia(solicitacao.criadoEm);
}

export async function recalcularPosSolicitacaoService({
  solicitacaoId,
  usuarioIdAuditoria,
}: RecalcularPosSolicitacaoParams) {
  const solicitacao = await prisma.solicitacao.findUnique({
    where: {
      id: solicitacaoId,
    },
    select: {
      id: true,
      servidorId: true,
      status: true,
      tipo: true,
      dataReferencia: true,
      dataInicio: true,
      dataFim: true,
      criadoEm: true,
    },
  });

  if (!solicitacao) {
    return {
      sucesso: false,
      mensagem: "Solicitacao nao encontrada para recalculo.",
    };
  }

  if (solicitacao.status !== "DEFERIDA") {
    return {
      sucesso: false,
      mensagem: "Somente solicitacoes deferidas geram recalculo automatico.",
    };
  }

  const dataImpactada = obterDataImpactada(solicitacao);
  const deveRecalcularApuracao =
    TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO.includes(
      solicitacao.tipo as (typeof TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO)[number],
    );
  const datasImpactadas = deveRecalcularApuracao
    ? listarDatasImpactadasSolicitacao(solicitacao)
    : [];
  const resultadosDias: Array<
    Awaited<ReturnType<typeof recalcularDiaServidorService>>
  > = [];

  for (const dataReferencia of datasImpactadas) {
    resultadosDias.push(
      await recalcularDiaServidorService({
        servidorId: solicitacao.servidorId,
        dataReferencia,
        usuarioIdAuditoria,
        origem: "RECALCULO_POS_SOLICITACAO",
      }),
    );
  }

  const resultadoDia = resultadosDias.length === 1 ? resultadosDias[0] : null;
  const inicioPeriodo = solicitacao.dataInicio ?? dataImpactada;
  const fimPeriodo = solicitacao.dataFim ?? inicioPeriodo;
  const meses = new Map<string, { anoReferencia: number; mesReferencia: number }>();
  const cursor = new Date(
    inicioPeriodo.getFullYear(),
    inicioPeriodo.getMonth(),
    1,
  );
  const limite = new Date(fimPeriodo.getFullYear(), fimPeriodo.getMonth(), 1);

  while (cursor <= limite) {
    const anoReferencia = cursor.getFullYear();
    const mesReferencia = cursor.getMonth() + 1;
    meses.set(`${anoReferencia}-${mesReferencia}`, {
      anoReferencia,
      mesReferencia,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const resultadosBanco: Array<{
    anoReferencia: number;
    mesReferencia: number;
    resultado: Awaited<ReturnType<typeof regerarBancoHorasMesService>>;
  }> = [];

  for (const competencia of meses.values()) {
    resultadosBanco.push({
      ...competencia,
      resultado: await regerarBancoHorasMesService({
        servidorId: solicitacao.servidorId,
        ...competencia,
        usuarioIdAuditoria,
        origem: "RECALCULO_POS_SOLICITACAO",
      }),
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId: solicitacao.id,
        usuarioId: usuarioIdAuditoria,
        tipo: "EFEITO_APLICADO",
        descricao:
          "Apuracao diaria e banco de horas recalculados apos deferimento da solicitacao.",
        metadados: {
          dataImpactada,
          datasImpactadas,
          resultadoDia: resultadoDia
            ? {
                apuracaoId: resultadoDia.apuracao.id,
                resultado: resultadoDia.apuracao.resultado,
                status: resultadoDia.apuracao.status,
                minutosTrabalhados: resultadoDia.apuracao.minutosTrabalhados,
                minutosCredito: resultadoDia.apuracao.minutosCredito,
                minutosDebito: resultadoDia.apuracao.minutosDebito,
              }
            : null,
          resultadosDias: resultadosDias.map((resultado) => ({
            apuracaoId: resultado.apuracao.id,
            dataReferencia: resultado.apuracao.dataReferencia,
            resultado: resultado.apuracao.resultado,
            status: resultado.apuracao.status,
            minutosTrabalhados: resultado.apuracao.minutosTrabalhados,
            minutosCredito: resultado.apuracao.minutosCredito,
            minutosDebito: resultado.apuracao.minutosDebito,
          })),
          resultadosBanco,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: usuarioIdAuditoria,
        entidade: "Solicitacao",
        entidadeId: solicitacao.id,
        acao: "RECALCULO_POS_SOLICITACAO_EXECUTADO",
        dadosDepois: {
          solicitacaoId: solicitacao.id,
          servidorId: solicitacao.servidorId,
          tipo: solicitacao.tipo,
          dataImpactada,
          datasImpactadas,
          resultadosBanco,
        },
      },
    });
  });

  return {
    sucesso: true,
    mensagem: "Recalculo pos-solicitacao executado com sucesso.",
    servidorId: solicitacao.servidorId,
    dataImpactada,
    datasImpactadas,
    resultadoDia,
    resultadosDias,
    resultadosBanco,
  };
}
