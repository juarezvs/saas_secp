import type { PrismaClient } from "@/generated/prisma/client";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { calcularCargaPrevistaComJanela } from "@/modules/apuracao/application/services/expediente.service";
import { calcularExcedenteElegivelBancoHoras } from "@/modules/banco-horas/application/services/classificar-horas-banco-horas.service";
import { classificarDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import {
  dataHoraLocalParaUtc,
  obterDataReferencia,
} from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { buscarRegulamentacaoPontoServidor } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";

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
        status: "ATIVO",
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

const TIPOS_DIA_ELEGIVEIS_CONVERSAO = new Set([
  "SABADO",
  "DOMINGO",
  "FERIADO",
  "PONTO_FACULTATIVO",
  "SUSPENSAO_EXPEDIENTE",
  "RECESSO_FORENSE",
]);

async function calcularTrabalhoDiaEspecial(params: {
  tx: Tx;
  servidorId: string;
  dataReferencia: Date;
}) {
  const dataReferencia = normalizarDataReferencia(params.dataReferencia);
  const classificacao = await classificarDiaInstitucional(
    dataReferencia,
    undefined,
    params.servidorId,
  );

  if (!TIPOS_DIA_ELEGIVEIS_CONVERSAO.has(classificacao.tipo)) {
    return {
      minutos: 0,
      erro: "A data informada não é feriado, ponto facultativo, suspensão, recesso ou outro dia não útil elegível.",
    };
  }

  const apuracao = await params.tx.apuracaoDiaria.findUnique({
    where: {
      servidorId_dataReferencia: {
        servidorId: params.servidorId,
        dataReferencia,
      },
    },
    select: {
      minutosTrabalhados: true,
    },
  });

  if (!apuracao || apuracao.minutosTrabalhados <= 0) {
    return {
      minutos: 0,
      erro: "Não há tempo trabalhado apurado nessa data para conversão.",
    };
  }

  return {
    minutos: apuracao.minutosTrabalhados,
    erro: null,
    classificacao: classificacao.tipo,
  };
}

async function calcularExcedenteDia(params: {
  tx: Tx;
  servidorId: string;
  dataReferencia: Date;
}) {
  const dataReferencia = normalizarDataReferencia(params.dataReferencia);
  const apuracao = await params.tx.apuracaoDiaria.findUnique({
    where: {
      servidorId_dataReferencia: {
        servidorId: params.servidorId,
        dataReferencia,
      },
    },
    select: {
      cargaPrevistaMinutos: true,
      minutosTrabalhados: true,
      minutosIntervalo: true,
      minutosCredito: true,
      primeiraEntrada: true,
      ultimaSaida: true,
    },
  });

  if (!apuracao) {
    return {
      minutos: 0,
      erro: "Não há horas excedentes apuradas nessa data para conversão.",
    };
  }

  const [classificacaoDia, regulamentacao] = await Promise.all([
    classificarDiaInstitucional(dataReferencia, undefined, params.servidorId),
    buscarRegulamentacaoPontoServidor(params.servidorId, params.tx),
  ]);
  const minutos = calcularExcedenteElegivelBancoHoras({
    apuracao,
    classificacaoDia,
    regulamentacao,
  });

  if (minutos <= 0) {
    return {
      minutos: 0,
      erro:
        "Não há excedente elegível para conversão nessa data, considerando a jornada e a regulamentação vigentes.",
    };
  }

  return { minutos, erro: null };
}

export async function aplicarEfeitosSolicitacaoDeferida(params: {
  tx: Tx;
  solicitacao: SolicitacaoParaEfeito;
  usuarioAnaliseId: string;
  justificativaAnalise: string;
}) {
  const { tx, solicitacao, usuarioAnaliseId, justificativaAnalise } = params;

  if (solicitacao.tipo === "EXCLUSAO_MARCACAO") {
    const dados = solicitacao.dadosSolicitados as Record<
      string,
      unknown
    > | null;
    const marcacaoId = String(dados?.marcacaoId ?? "");
    const marcacao = await tx.marcacao.findFirst({
      where: {
        id: marcacaoId,
        servidorId: solicitacao.servidorId,
        status: { in: ["VALIDA", "AJUSTADA", "PENDENTE"] },
      },
    });
    if (!marcacao) {
      return {
        efeitosAplicados: false,
        mensagem: "MarcaÃ§Ã£o nÃ£o encontrada ou jÃ¡ cancelada.",
      };
    }
    const metadados =
      marcacao.metadados &&
      typeof marcacao.metadados === "object" &&
      !Array.isArray(marcacao.metadados)
        ? marcacao.metadados
        : {};
    const atualizada = await tx.marcacao.update({
      where: { id: marcacao.id },
      data: {
        status: "CANCELADA",
        observacao: `MarcaÃ§Ã£o cancelada pelo deferimento da solicitaÃ§Ã£o ${solicitacao.id}.`,
        metadados: {
          ...metadados,
          solicitacaoExclusaoId: solicitacao.id,
          canceladaPorUsuarioId: usuarioAnaliseId,
          canceladaEm: new Date().toISOString(),
          justificativa: justificativaAnalise,
        },
      },
    });
    await tx.auditoriaEvento.create({
      data: {
        usuarioId: usuarioAnaliseId,
        entidade: "Marcacao",
        entidadeId: marcacao.id,
        acao: "MARCACAO_CANCELADA_POR_SOLICITACAO",
        dadosAntes: {
          status: marcacao.status,
          dataHora: marcacao.dataHora,
          tipo: marcacao.tipo,
        },
        dadosDepois: {
          status: atualizada.status,
          solicitacaoId: solicitacao.id,
        },
      },
    });
    return {
      efeitosAplicados: true,
      mensagem: "MarcaÃ§Ã£o cancelada e encaminhada para recÃ¡lculo.",
      dadosResultado: { marcacaoId: atualizada.id, status: atualizada.status },
    };
  }

  if (
    [
      "HORA_CREDITO_PREVIA",
      "COMPENSACAO",
      "FOLGA_BANCO_HORAS",
      "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
      "CONVERSAO_EXCEDENTE_BANCO_HORAS",
    ].includes(solicitacao.tipo)
  ) {
    const dadosAutorizacao = extrairDadosAutorizacao(
      solicitacao.dadosSolicitados,
    );

    const dataInicio =
      solicitacao.dataInicio ?? solicitacao.dataReferencia ?? null;
    const dataFim = solicitacao.dataFim ?? solicitacao.dataReferencia ?? null;

    if (!dataInicio || !dataFim || !dadosAutorizacao) {
      return {
        efeitosAplicados: false,
        mensagem:
          "Solicitação sem período válido para autorização do banco de horas.",
      };
    }

    const tipo = [
      "HORA_CREDITO_PREVIA",
      "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
      "CONVERSAO_EXCEDENTE_BANCO_HORAS",
    ].includes(solicitacao.tipo)
      ? "CREDITO"
      : solicitacao.tipo === "FOLGA_BANCO_HORAS"
        ? "COMPENSACAO_CREDITO"
        : dadosAutorizacao.tipoCompensacao === "COMPENSAR_DEBITO"
          ? "COMPENSACAO_DEBITO"
          : "COMPENSACAO_CREDITO";
    const trabalhoDiaEspecial =
      solicitacao.tipo === "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS"
        ? await calcularTrabalhoDiaEspecial({
            tx,
            servidorId: solicitacao.servidorId,
            dataReferencia: dataInicio,
          })
        : null;
    const excedenteDia =
      solicitacao.tipo === "CONVERSAO_EXCEDENTE_BANCO_HORAS"
        ? await calcularExcedenteDia({
            tx,
            servidorId: solicitacao.servidorId,
            dataReferencia: dataInicio,
          })
        : null;
    if (excedenteDia?.erro) {
      return { efeitosAplicados: false, mensagem: excedenteDia.erro };
    }
    if (
      excedenteDia &&
      dadosAutorizacao.minutosSolicitados &&
      dadosAutorizacao.minutosSolicitados > excedenteDia.minutos
    ) {
      return {
        efeitosAplicados: false,
        mensagem: `A quantidade solicitada excede os ${excedenteDia.minutos} minutos disponíveis no dia.`,
      };
    }
    const minutosAutorizados =
      dadosAutorizacao.minutosSolicitados ??
      (trabalhoDiaEspecial
        ? trabalhoDiaEspecial.minutos
        : excedenteDia
          ? excedenteDia.minutos
          : solicitacao.tipo === "FOLGA_BANCO_HORAS"
            ? await calcularMinutosFolgaBancoHoras({
                tx,
                servidorId: solicitacao.servidorId,
                dataInicio,
                dataFim,
              })
            : solicitacao.tipo === "COMPENSACAO"
              ? await calcularMinutosPendentesCompensacao({
                  tx,
                  servidorId: solicitacao.servidorId,
                  dataInicio,
                  dataFim,
                })
              : 0);

    if (minutosAutorizados <= 0) {
      return {
        efeitosAplicados: false,
        mensagem:
          trabalhoDiaEspecial?.erro ??
          (solicitacao.tipo === "FOLGA_BANCO_HORAS"
            ? "Não foram encontrados dias úteis com jornada vigente para autorizar a folga."
            : "Não foram encontrados minutos pendentes no período informado."),
      };
    }

    const autorizacao = await tx.autorizacaoBancoHoras.upsert({
      where: {
        solicitacaoId: solicitacao.id,
      },
      update: {
        tipo,
        status: "AUTORIZADA",
        dataInicio,
        dataFim,
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
        dataInicio,
        dataFim,
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
          : solicitacao.tipo === "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS"
            ? "Conversão do trabalho em dia especial autorizada pela chefia e encaminhada ao banco de horas."
            : solicitacao.tipo === "CONVERSAO_EXCEDENTE_BANCO_HORAS"
              ? "Conversão do excedente em crédito autorizada pela chefia e encaminhada ao banco de horas."
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

  if (solicitacao.tipo === "DISPENSA_PONTO") {
    const datasImpactadas = listarDatasImpactadasSolicitacao(solicitacao);

    if (datasImpactadas.length === 0) {
      return {
        efeitosAplicados: false,
        mensagem: "Solicitacao de dispensa de ponto sem periodo valido.",
      };
    }

    return {
      efeitosAplicados: true,
      mensagem:
        "Dispensa de ponto deferida. O periodo sera aplicado e o espelho de ponto recalculado.",
      dadosResultado: {
        datasImpactadas: datasImpactadas.map((data) =>
          data.toISOString().slice(0, 10),
        ),
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
      OR: [{ dataFim: null }, { dataFim: { gte: solicitacao.dataReferencia } }],
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
