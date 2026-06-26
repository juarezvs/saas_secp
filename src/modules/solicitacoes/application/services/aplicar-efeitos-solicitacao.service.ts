import type { PrismaClient } from "@/generated/prisma/client";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { calcularCargaPrevistaComJanela } from "@/modules/apuracao/application/services/expediente.service";
import { classificarDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import {
  dataHoraLocalParaUtc,
  obterDataReferencia,
} from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";

import { listarDatasImpactadasSolicitacao } from "./periodo-solicitacao.service";

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

  return {
    minutosSolicitados:
      Number.isInteger(minutosSolicitados) && minutosSolicitados > 0
        ? minutosSolicitados
        : null,
    tipoCompensacao,
  };
}

async function calcularMinutosPendentesCompensacao(params: {
  tx: Tx;
  servidorId: string;
  dataInicio: Date;
  dataFim: Date;
}) {
  const apuracoes = await params.tx.apuracaoDiaria.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: {
        gte: normalizarDataReferencia(params.dataInicio),
        lt: normalizarDataReferencia(params.dataFim),
      },
      minutosDebito: {
        gt: 0,
      },
    },
    select: {
      minutosDebito: true,
    },
  });

  return apuracoes.reduce(
    (total, apuracao) => total + apuracao.minutosDebito,
    0,
  );
}

async function calcularMinutosFolgaBancoHoras(params: {
  tx: Tx;
  servidorId: string;
  dataInicio: Date;
  dataFim: Date;
}) {
  const datas = listarDatasImpactadasSolicitacao({
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });
  let total = 0;

  for (const dataReferencia of datas) {
    const classificacao = await classificarDiaInstitucional(dataReferencia);

    if (!classificacao.contaComoDiaUtil || !classificacao.geraApuracaoRegular) {
      continue;
    }

    const jornada = await params.tx.jornadaServidor.findFirst({
      where: {
        servidorId: params.servidorId,
        ativo: true,
        dataInicio: {
          lte: dataReferencia,
        },
        OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
      },
      include: {
        jornada: true,
      },
      orderBy: {
        dataInicio: "desc",
      },
    });

    if (!jornada) {
      continue;
    }

    total += calcularCargaPrevistaComJanela(
      jornada.jornada.cargaDiariaMinutos,
      classificacao.janelaInicio && classificacao.janelaFim
        ? {
            inicio: classificacao.janelaInicio,
            fim: classificacao.janelaFim,
          }
        : null,
    );
  }

  return total;
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

  if (
    ["HORA_CREDITO_PREVIA", "COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(
      solicitacao.tipo,
    )
  ) {
    const dadosAutorizacao = extrairDadosAutorizacao(
      solicitacao.dadosSolicitados,
    );

    if (!solicitacao.dataInicio || !solicitacao.dataFim || !dadosAutorizacao) {
      return {
        efeitosAplicados: false,
        mensagem:
          "Solicitação sem período válido para autorização do banco de horas.",
      };
    }

    const tipo =
      solicitacao.tipo === "HORA_CREDITO_PREVIA"
        ? "CREDITO"
        : solicitacao.tipo === "FOLGA_BANCO_HORAS"
          ? "COMPENSACAO_CREDITO"
          : dadosAutorizacao.tipoCompensacao === "COMPENSAR_DEBITO"
          ? "COMPENSACAO_DEBITO"
          : "COMPENSACAO_CREDITO";
    const minutosAutorizados =
      dadosAutorizacao.minutosSolicitados ??
      (solicitacao.tipo === "FOLGA_BANCO_HORAS"
        ? await calcularMinutosFolgaBancoHoras({
            tx,
            servidorId: solicitacao.servidorId,
            dataInicio: solicitacao.dataInicio,
            dataFim: solicitacao.dataFim,
          })
        : solicitacao.tipo === "COMPENSACAO"
          ? await calcularMinutosPendentesCompensacao({
              tx,
              servidorId: solicitacao.servidorId,
              dataInicio: solicitacao.dataInicio,
              dataFim: solicitacao.dataFim,
            })
          : 0);

    if (minutosAutorizados <= 0) {
      return {
        efeitosAplicados: false,
        mensagem:
          solicitacao.tipo === "FOLGA_BANCO_HORAS"
            ? "Não foram encontrados dias úteis com jornada vigente para autorizar a folga."
            : "Não foram encontrados minutos pendentes no período informado.",
      };
    }

    const autorizacao = await tx.autorizacaoBancoHoras.upsert({
      where: {
        solicitacaoId: solicitacao.id,
      },
      update: {
        tipo,
        status: "AUTORIZADA",
        dataInicio: solicitacao.dataInicio,
        dataFim: solicitacao.dataFim,
        minutosAutorizados,
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
        minutosAutorizados,
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
          : solicitacao.tipo === "FOLGA_BANCO_HORAS"
            ? "Folga com banco de horas autorizada pela chefia."
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

  const lotacao = await tx.lotacao.findFirst({
    where: {
      servidorId: solicitacao.servidorId,
      status: "ATIVO",
      dataInicio: {
        lte: solicitacao.dataReferencia,
      },
      OR: [
        { dataFim: null },
        { dataFim: { gte: solicitacao.dataReferencia } },
      ],
    },
    include: {
      unidade: {
        include: {
          orgao: {
            select: {
              fusoHorario: true,
            },
          },
          unidadePai: {
            include: {
              orgao: {
                select: {
                  fusoHorario: true,
                },
              },
              unidadePai: {
                include: {
                  orgao: {
                    select: {
                      fusoHorario: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });
  const fusoHorario = resolverFusoHorarioUnidade(lotacao?.unidade);
  const dataHoraAjuste = dataHoraLocalParaUtc({
    dataReferencia: solicitacao.dataReferencia,
    hora: dadosAjuste.horaAjuste,
    fusoHorario,
  });
  const dataReferencia = obterDataReferencia(dataHoraAjuste, fusoHorario);

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
      fusoHorario,
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
