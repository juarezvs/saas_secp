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
  const anoReferencia = dataImpactada.getFullYear();
  const mesReferencia = dataImpactada.getMonth() + 1;

  const resultadoDia = await recalcularDiaServidorService({
    servidorId: solicitacao.servidorId,
    dataReferencia: dataImpactada,
    usuarioIdAuditoria,
    origem: "RECALCULO_POS_SOLICITACAO",
  });

  const resultadoBanco = await regerarBancoHorasMesService({
    servidorId: solicitacao.servidorId,
    anoReferencia,
    mesReferencia,
    usuarioIdAuditoria,
    origem: "RECALCULO_POS_SOLICITACAO",
  });

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
          resultadoDia: {
            apuracaoId: resultadoDia.apuracao.id,
            resultado: resultadoDia.apuracao.resultado,
            status: resultadoDia.apuracao.status,
            minutosTrabalhados: resultadoDia.apuracao.minutosTrabalhados,
            minutosCredito: resultadoDia.apuracao.minutosCredito,
            minutosDebito: resultadoDia.apuracao.minutosDebito,
          },
          resultadoBanco,
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
          resultadoBanco,
        },
      },
    });
  });

  return {
    sucesso: true,
    mensagem: "Recálculo pós-solicitação executado com sucesso.",
    dataImpactada,
    resultadoDia,
    resultadoBanco,
  };
}
