export const CARGA_DEDICACAO_INTEGRAL_MINUTOS = 480;
export const TAMANHO_MINIMO_JUSTIFICATIVA_EXCECAO_FC_CJ = 20;

type AvaliarCompatibilidadeParams = {
  descricaoCargoServidor?: string | null;
  descricoesCargosLotacoes?: Array<string | null | undefined>;
  jornadaCargaDiariaMinutos: number;
  justificativa?: string | null;
};

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function ehDescricaoFuncaoComissionada(
  descricao: string | null | undefined,
) {
  if (!descricao) return false;

  const texto = normalizarTexto(descricao);

  return (
    /\b(CJ|FC)\s*-?\s*\d*\b/.test(texto) ||
    texto.includes("CARGO EM COMISSAO") ||
    texto.includes("FUNCAO COMISSIONADA") ||
    texto.includes("FUNCAO DE CONFIANCA")
  );
}

export function servidorExigeDedicacaoIntegral(params: {
  descricaoCargoServidor?: string | null;
  descricoesCargosLotacoes?: Array<string | null | undefined>;
}) {
  return [
    params.descricaoCargoServidor,
    ...(params.descricoesCargosLotacoes ?? []),
  ].some(ehDescricaoFuncaoComissionada);
}

export function justificativaExcecaoFcCjValida(
  justificativa: string | null | undefined,
) {
  return (
    (justificativa?.trim().length ?? 0) >=
    TAMANHO_MINIMO_JUSTIFICATIVA_EXCECAO_FC_CJ
  );
}

export function avaliarCompatibilidadeJornadaDedicacaoIntegral(
  params: AvaliarCompatibilidadeParams,
) {
  const exigeDedicacaoIntegral = servidorExigeDedicacaoIntegral(params);
  const jornadaPreferencial =
    params.jornadaCargaDiariaMinutos >= CARGA_DEDICACAO_INTEGRAL_MINUTOS;
  const justificativaExcecaoValida = justificativaExcecaoFcCjValida(
    params.justificativa,
  );

  return {
    exigeDedicacaoIntegral,
    jornadaPreferencial,
    exigeJustificativaExcecao:
      exigeDedicacaoIntegral && !jornadaPreferencial,
    compativel:
      !exigeDedicacaoIntegral ||
      jornadaPreferencial ||
      justificativaExcecaoValida,
  };
}
