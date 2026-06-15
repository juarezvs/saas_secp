import type { PrismaClient } from "@/generated/prisma/client";
import { obterDataReferencia } from "@/modules/marcacoes/application/services/data-marcacao.service";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type SolicitacaoParaEfeito = {
  id: string;
  servidorId: string;
  usuarioSolicitanteId: string;
  tipo: string;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
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

function extrairDadosAutorizacao(dados: unknown) {
  if (!dados || typeof dados !== "object") {
    return null;
  }

  const obj = dados as Record<string, unknown>;
  const minutosSolicitados = Number(obj.minutosSolicitados);
  const tipoCompensacao = String(obj.tipoCompensacao ?? "");

  if (!Number.isInteger(minutosSolicitados) || minutosSolicitados <= 0) {
    return null;
  }

  return {
    minutosSolicitados,
    tipoCompensacao,
  };
}

export async function aplicarEfeitosSolicitacaoDeferida(params: {
  tx: Tx;
  solicitacao: SolicitacaoParaEfeito;
  usuarioAnaliseId: string;
  justificativaAnalise: string;
}) {
  const {
    tx,
    solicitacao,
    usuarioAnaliseId,
    justificativaAnalise,
  } = params;

  if (["HORA_CREDITO_PREVIA", "COMPENSACAO"].includes(solicitacao.tipo)) {
    const dadosAutorizacao = extrairDadosAutorizacao(
      solicitacao.dadosSolicitados,
    );

    if (
      !solicitacao.dataInicio ||
      !solicitacao.dataFim ||
      !dadosAutorizacao
    ) {
      return {
        efeitosAplicados: false,
        mensagem:
          "Solicitação sem período ou quantidade válidos para autorização do banco de horas.",
      };
    }

    const tipo =
      solicitacao.tipo === "HORA_CREDITO_PREVIA"
        ? "CREDITO"
        : dadosAutorizacao.tipoCompensacao === "COMPENSAR_DEBITO"
          ? "COMPENSACAO_DEBITO"
          : "COMPENSACAO_CREDITO";

    const autorizacao = await tx.autorizacaoBancoHoras.upsert({
      where: {
        solicitacaoId: solicitacao.id,
      },
      update: {
        tipo,
        status: "AUTORIZADA",
        dataInicio: solicitacao.dataInicio,
        dataFim: solicitacao.dataFim,
        minutosAutorizados: dadosAutorizacao.minutosSolicitados,
        autorizadoPorUsuarioId: usuarioAnaliseId,
        justificativa: justificativaAnalise,
        autorizadoEm: new Date(),
      },
      create: {
        solicitacaoId: solicitacao.id,
        servidorId: solicitacao.servidorId,
        autorizadoPorUsuarioId: usuarioAnaliseId,
        tipo,
        status: "AUTORIZADA",
        dataInicio: solicitacao.dataInicio,
        dataFim: solicitacao.dataFim,
        minutosAutorizados: dadosAutorizacao.minutosSolicitados,
        justificativa: justificativaAnalise,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: usuarioAnaliseId,
        entidade: "AutorizacaoBancoHoras",
        entidadeId: autorizacao.id,
        acao: "AUTORIZACAO_PREVIA_CONCEDIDA",
        dadosDepois: {
          solicitacaoId: solicitacao.id,
          servidorId: solicitacao.servidorId,
          tipo: autorizacao.tipo,
          status: autorizacao.status,
          dataInicio: autorizacao.dataInicio,
          dataFim: autorizacao.dataFim,
          minutosAutorizados: autorizacao.minutosAutorizados,
          justificativa: justificativaAnalise,
        },
      },
    });

    return {
      efeitosAplicados: true,
      mensagem:
        solicitacao.tipo === "HORA_CREDITO_PREVIA"
          ? "Crédito previamente autorizado pela chefia."
          : "Compensação previamente autorizada pela chefia.",
      dadosResultado: {
        autorizacaoBancoHorasId: autorizacao.id,
        tipo: autorizacao.tipo,
        status: autorizacao.status,
        dataInicio: autorizacao.dataInicio,
        dataFim: autorizacao.dataFim,
        minutosAutorizados: autorizacao.minutosAutorizados,
        autorizadoPorUsuarioId: autorizacao.autorizadoPorUsuarioId,
        autorizadoEm: autorizacao.autorizadoEm,
      },
    };
  }

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
