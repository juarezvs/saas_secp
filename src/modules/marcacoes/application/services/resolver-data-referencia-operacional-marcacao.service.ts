import type { FonteMarcacao, Prisma, TipoMarcacao } from "@/generated/prisma/client";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";

import {
  obterMinutosLocais,
  subtrairDiasDataReferencia,
} from "./data-marcacao.service";

type MarcacaoClient = Pick<Prisma.TransactionClient, "marcacao"> &
  Partial<Pick<Prisma.TransactionClient, "jornadaServidor">>;

const ORIGENS_COM_JANELA_OPERACIONAL = [
  "EQUIPAMENTO_BIOMETRICO",
  "IMPORTACAO_AFD",
  "WEB_AUTORIZADO",
  "FACIAL_AUTORIZADO",
  "TOTEM_FACIAL_SECP",
  "WEB",
  "BIOMETRIA_FACIAL",
];
const FONTES_IMPORTADAS: FonteMarcacao[] = [
  "WEB",
  "BIOMETRIA_FACIAL",
  "EQUIPAMENTO_BIOMETRICO",
  "AFD",
  "MANUAL_ADMINISTRATIVO",
  "IMPORTACAO",
];
const TIPOS_SEQUENCIA: TipoMarcacao[] = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
];
const LIMITE_MADRUGADA_PADRAO = "04:00";
const INICIO_NOITE_PADRAO = "18:00";

function horaParaMinutos(valor: string | null | undefined, fallback: string) {
  const hora = valor || fallback;
  const match = /^(\d{2}):([0-5]\d)$/.exec(hora);

  if (!match) {
    return horaParaMinutos(fallback, LIMITE_MADRUGADA_PADRAO);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function diaTrabalhadoCruzaMeiaNoite(
  previsao: ReturnType<typeof resolverPrevisaoJornadaDia>,
) {
  return (
    previsao.trabalha &&
    (Boolean(previsao.janela?.cruzaMeiaNoite) ||
      previsao.faixas.some((faixa) => faixa.cruzaMeiaNoite))
  );
}

async function resolverConfiguracaoJornadaAnterior(
  client: MarcacaoClient,
  params: {
    servidorId: string;
    dataReferenciaAnterior: Date;
  },
) {
  if (!client.jornadaServidor) {
    return null;
  }

  const jornadaServidor = await client.jornadaServidor.findFirst({
    where: {
      servidorId: params.servidorId,
      ativo: true,
      status: "ATIVO",
      dataInicio: {
        lte: params.dataReferenciaAnterior,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: params.dataReferenciaAnterior,
          },
        },
      ],
    },
    include: {
      escala: {
        include: {
          dias: true,
        },
      },
      jornada: {
        include: {
          dias: {
            include: {
              faixas: {
                orderBy: {
                  ordem: "asc",
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

  if (!jornadaServidor) {
    return null;
  }

  const previsao = resolverPrevisaoJornadaDia({
    jornada: jornadaServidor.jornada,
    escala: jornadaServidor.escala,
    dataReferencia: params.dataReferenciaAnterior,
    dataAncoragemJornada: jornadaServidor.dataInicio,
  });

  if (!diaTrabalhadoCruzaMeiaNoite(previsao)) {
    return null;
  }

  return {
    limiteViradaMadrugada: jornadaServidor.jornada.horarioLimiteVirada,
    inicioJanelaNoite:
      previsao.janela?.inicio ??
      previsao.faixas.find((faixa) => faixa.tipo === "TRABALHO")?.horaInicio ??
      jornadaServidor.jornada.horarioEntradaPadrao,
  };
}

export type ResolucaoDataReferenciaOperacional = {
  dataReferencia: Date;
  dataReferenciaCivil: Date;
  ajustadaParaDiaAnterior: boolean;
  motivo?: "FECHAMENTO_JORNADA_INICIADA_DIA_ANTERIOR";
};

export async function resolverDataReferenciaOperacionalMarcacaoService(
  client: MarcacaoClient,
  params: {
    servidorId: string;
    dataHora: Date;
    dataReferenciaCivil: Date;
    fusoHorario: string;
    origem: string;
    regulamentacaoPonto?: {
      limiteViradaMadrugada?: string | null;
      inicioJanelaNoite?: string | null;
    } | null;
  },
): Promise<ResolucaoDataReferenciaOperacional> {
  const resolucaoPadrao = {
    dataReferencia: params.dataReferenciaCivil,
    dataReferenciaCivil: params.dataReferenciaCivil,
    ajustadaParaDiaAnterior: false,
  };

  if (!ORIGENS_COM_JANELA_OPERACIONAL.includes(params.origem)) {
    return resolucaoPadrao;
  }

  const minutosLocais = obterMinutosLocais(params.dataHora, params.fusoHorario);
  const dataReferenciaAnterior = subtrairDiasDataReferencia(
    params.dataReferenciaCivil,
    1,
  );
  const configuracaoJornadaAnterior =
    await resolverConfiguracaoJornadaAnterior(client, {
      servidorId: params.servidorId,
      dataReferenciaAnterior,
    });
  const limiteMadrugadaMinutos = horaParaMinutos(
    configuracaoJornadaAnterior?.limiteViradaMadrugada ??
      params.regulamentacaoPonto?.limiteViradaMadrugada,
    LIMITE_MADRUGADA_PADRAO,
  );
  const inicioNoiteMinutos = horaParaMinutos(
    configuracaoJornadaAnterior?.inicioJanelaNoite ??
      params.regulamentacaoPonto?.inicioJanelaNoite,
    INICIO_NOITE_PADRAO,
  );

  if (minutosLocais >= limiteMadrugadaMinutos) {
    return resolucaoPadrao;
  }

  const marcacoesDiaAnterior = await client.marcacao.findMany({
    where: {
      servidorId: params.servidorId,
      dataReferencia: dataReferenciaAnterior,
      status: {
        in: ["VALIDA", "PENDENTE", "AJUSTADA"],
      },
      fonte: {
        in: FONTES_IMPORTADAS,
      },
      tipo: {
        in: TIPOS_SEQUENCIA,
      },
    },
    orderBy: {
      dataHora: "asc",
    },
    select: {
      dataHora: true,
    },
  });

  const ultimaMarcacaoAnterior = marcacoesDiaAnterior.at(-1);

  if (!ultimaMarcacaoAnterior || marcacoesDiaAnterior.length % 2 === 0) {
    return resolucaoPadrao;
  }

  const minutosUltimaMarcacaoAnterior = obterMinutosLocais(
    ultimaMarcacaoAnterior.dataHora,
    params.fusoHorario,
  );

  if (minutosUltimaMarcacaoAnterior < inicioNoiteMinutos) {
    return resolucaoPadrao;
  }

  return {
    dataReferencia: dataReferenciaAnterior,
    dataReferenciaCivil: params.dataReferenciaCivil,
    ajustadaParaDiaAnterior: true,
    motivo: "FECHAMENTO_JORNADA_INICIADA_DIA_ANTERIOR",
  };
}
