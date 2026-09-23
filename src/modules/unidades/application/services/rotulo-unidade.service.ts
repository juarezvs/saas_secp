export type UnidadeHierarquiaRotulo = {
  sigla: string;
  nome: string;
  orgao?: {
    sigla: string;
  } | null;
  unidadePai?: UnidadeHierarquiaRotulo | null;
};

const SIGLAS_RAIZ_OCULTAS = new Set(["SJTRF1AR"]);

export function montarCaminhoUnidadeSuperior(unidade: UnidadeHierarquiaRotulo) {
  const partes: string[] = [];
  let atual = unidade.unidadePai ?? null;

  while (atual) {
    if (SIGLAS_RAIZ_OCULTAS.has(atual.sigla)) {
      break;
    }

    if (atual.sigla && !partes.includes(atual.sigla)) {
      partes.push(atual.sigla);
    }

    atual = atual.unidadePai ?? null;
  }

  const orgaoSigla = unidade.orgao?.sigla;

  if (
    orgaoSigla &&
    !SIGLAS_RAIZ_OCULTAS.has(orgaoSigla) &&
    !partes.includes(orgaoSigla)
  ) {
    partes.push(orgaoSigla);
  }

  return partes.join("/");
}

export function montarRotuloUnidadeComHierarquia(
  unidade: UnidadeHierarquiaRotulo,
) {
  const caminho = montarCaminhoUnidadeSuperior(unidade);
  return caminho ? `${unidade.sigla} (${caminho})` : unidade.sigla;
}

export function montarTextoBuscaUnidade(unidade: UnidadeHierarquiaRotulo) {
  const caminho = montarCaminhoUnidadeSuperior(unidade);
  return [unidade.sigla, unidade.nome, caminho].filter(Boolean).join(" ");
}
