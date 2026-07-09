import type { FonteMarcacao, Prisma, TipoMarcacao } from "@/generated/prisma/client";

import {
  obterMinutosLocais,
  subtrairDiasDataReferencia,
} from "./data-marcacao.service";

type MarcacaoClient = Pick<Prisma.TransactionClient, "marcacao">;

const ORIGENS_COM_JANELA_OPERACIONAL = [
  "EQUIPAMENTO_BIOMETRICO",
  "IMPORTACAO_AFD",
];
const FONTES_IMPORTADAS: FonteMarcacao[] = [
  "EQUIPAMENTO_BIOMETRICO",
  "AFD",
  "IMPORTACAO",
];
const TIPOS_SEQUENCIA: TipoMarcacao[] = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
];
const LIMITE_MADRUGADA_MINUTOS = 4 * 60;
const INICIO_NOITE_MINUTOS = 18 * 60;

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

  if (minutosLocais >= LIMITE_MADRUGADA_MINUTOS) {
    return resolucaoPadrao;
  }

  const dataReferenciaAnterior = subtrairDiasDataReferencia(
    params.dataReferenciaCivil,
    1,
  );
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

  if (minutosUltimaMarcacaoAnterior < INICIO_NOITE_MINUTOS) {
    return resolucaoPadrao;
  }

  return {
    dataReferencia: dataReferenciaAnterior,
    dataReferenciaCivil: params.dataReferenciaCivil,
    ajustadaParaDiaAnterior: true,
    motivo: "FECHAMENTO_JORNADA_INICIADA_DIA_ANTERIOR",
  };
}
