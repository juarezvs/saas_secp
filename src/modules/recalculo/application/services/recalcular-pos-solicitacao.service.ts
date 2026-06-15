import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { recalcularDiaServidorService } from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";

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
      mensagem: "Solicitação não encontrada para recálculo.",
    };
  }

  if (solicitacao.status !== "DEFERIDA") {
    return {
      sucesso: false,
      mensagem: "Somente solicitações deferidas geram recálculo automático.",
    };
  }

  const dataImpactada = obterDataImpactada(solicitacao);
  const resultadoDia =
    solicitacao.tipo === "AJUSTE_PONTO"
      ? await recalcularDiaServidorService({
          servidorId: solicitacao.servidorId,
          dataReferencia: dataImpactada,
          usuarioIdAuditoria,
          origem: "RECALCULO_POS_SOLICITACAO",
        })
      : null;

  const inicioPeriodo = solicitacao.dataInicio ?? dataImpactada;
  const fimPeriodo = solicitacao.dataFim ?? inicioPeriodo;
  const meses = new Map<string, { anoReferencia: number; mesReferencia: number }>();
  const cursor = new Date(inicioPeriodo.getFullYear(), inicioPeriodo.getMonth(), 1);
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
          "Apuração diária e banco de horas recalculados após deferimento da solicitação.",
        metadados: {
          dataImpactada,
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
          resultadosBanco,
        },
      },
    });
  });

  return {
    sucesso: true,
    mensagem: "Recálculo pós-solicitação executado com sucesso.",
    dataImpactada,
    resultadoDia,
    resultadosBanco,
  };
}
