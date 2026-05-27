import type { PrismaClient } from "@/generated/prisma/client";
import { obterDataReferencia } from "@/modules/marcacoes/application/services/data-marcacao.service";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type SolicitacaoParaEfeito = {
  id: string;
  servidorId: string;
  usuarioSolicitanteId: string;
  tipo: string;
  dataReferencia: Date | null;
  dadosSolicitados: unknown;
};

function extrairDadosAjuste(dados: unknown) {
  if (!dados || typeof dados !== "object") {
    return null;
  }

  const obj = dados as Record<string, unknown>;

  const tipoMarcacao = String(obj.tipoMarcacao ?? "");
  const horaAjuste = String(obj.horaAjuste ?? "");

  if (!tipoMarcacao || !horaAjuste) {
    return null;
  }

  return {
    tipoMarcacao,
    horaAjuste,
  };
}

export async function aplicarEfeitosSolicitacaoDeferida(params: {
  tx: Tx;
  solicitacao: SolicitacaoParaEfeito;
  usuarioAnaliseId: string;
}) {
  const { tx, solicitacao, usuarioAnaliseId } = params;

  if (solicitacao.tipo !== "AJUSTE_PONTO") {
    return {
      efeitosAplicados: false,
      mensagem:
        "Tipo de solicitação deferido sem efeito automático nesta etapa. Será tratado em módulo específico.",
    };
  }

  if (!solicitacao.dataReferencia) {
    return {
      efeitosAplicados: false,
      mensagem: "Solicitação de ajuste sem data de referência.",
    };
  }

  const dadosAjuste = extrairDadosAjuste(solicitacao.dadosSolicitados);

  if (!dadosAjuste) {
    return {
      efeitosAplicados: false,
      mensagem: "Dados de ajuste de ponto incompletos.",
    };
  }

  const dataIso = solicitacao.dataReferencia.toISOString().slice(0, 10);
  const dataHoraAjuste = new Date(`${dataIso}T${dadosAjuste.horaAjuste}:00`);
  const dataReferencia = obterDataReferencia(dataHoraAjuste);

  const jornadaServidor = await tx.jornadaServidor.findFirst({
    where: {
      servidorId: solicitacao.servidorId,
      ativo: true,
      dataInicio: {
        lte: dataReferencia,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: dataReferencia,
          },
        },
      ],
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  const marcacao = await tx.marcacao.create({
    data: {
      servidorId: solicitacao.servidorId,
      jornadaServidorId: jornadaServidor?.id ?? null,
      dataHora: dataHoraAjuste,
      dataReferencia,
      tipo: dadosAjuste.tipoMarcacao as never,
      fonte: "MANUAL_ADMINISTRATIVO",
      status: "AJUSTADA",
      observacao: `Marcação criada por deferimento da solicitação ${solicitacao.id}.`,
      criadaPorUsuarioId: usuarioAnaliseId,
      metadados: {
        solicitacaoId: solicitacao.id,
        origem: "SOLICITACAO_DEFERIDA",
      },
    },
  });

  return {
    efeitosAplicados: true,
    mensagem: "Marcação de ajuste criada com sucesso.",
    dadosResultado: {
      marcacaoId: marcacao.id,
      dataHora: marcacao.dataHora,
      tipo: marcacao.tipo,
      fonte: marcacao.fonte,
      status: marcacao.status,
    },
  };
}