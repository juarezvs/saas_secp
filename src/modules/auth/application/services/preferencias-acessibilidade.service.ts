export const TAMANHOS_FONTE_ACESSIBILIDADE = [
  "13",
  "14",
  "16",
  "18",
  "20",
  "24",
  "30",
] as const;

export type TemaAcessibilidade = "light" | "dark";
export type TemaVisualAcessibilidade = "padrao" | "azul" | "verde" | "cinza";
export type TamanhoFonteAcessibilidade =
  (typeof TAMANHOS_FONTE_ACESSIBILIDADE)[number];
export type PosicaoVlibrasAcessibilidade = {
  x: number;
  y: number;
};
export type PosicaoChatInternoAcessibilidade = {
  x: number;
  y: number;
};

export type PreferenciasAcessibilidade = {
  tema: TemaAcessibilidade;
  temaVisual: TemaVisualAcessibilidade;
  tamanhoFonte: TamanhoFonteAcessibilidade;
  fonteDislexia: boolean;
  altoContraste: boolean;
  vlibrasPosicao: PosicaoVlibrasAcessibilidade | null;
  chatInternoPosicao: PosicaoChatInternoAcessibilidade | null;
};

export const PREFERENCIAS_ACESSIBILIDADE_PADRAO: PreferenciasAcessibilidade = {
  tema: "light",
  temaVisual: "padrao",
  tamanhoFonte: "16",
  fonteDislexia: false,
  altoContraste: false,
  vlibrasPosicao: null,
  chatInternoPosicao: null,
};

function normalizarTema(valor: unknown): TemaAcessibilidade {
  return valor === "dark" || valor === "light" ? valor : "light";
}

function normalizarTemaVisual(valor: unknown): TemaVisualAcessibilidade {
  return valor === "padrao" ||
    valor === "azul" ||
    valor === "verde" ||
    valor === "cinza"
    ? valor
    : "padrao";
}

function normalizarTamanhoFonte(valor: unknown): TamanhoFonteAcessibilidade {
  if (valor === "normal") {
    return "16";
  }

  if (valor === "large") {
    return "18";
  }

  if (valor === "xlarge") {
    return "20";
  }

  if (TAMANHOS_FONTE_ACESSIBILIDADE.includes(valor as never)) {
    return valor as TamanhoFonteAcessibilidade;
  }

  return "16";
}

function normalizarPosicaoVlibras(
  valor: unknown,
): PosicaoVlibrasAcessibilidade | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return null;
  }

  const objeto = valor as Record<string, unknown>;
  const x = Number(objeto.x);
  const y = Number(objeto.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.min(Math.max(Math.round(x), 0), 10000),
    y: Math.min(Math.max(Math.round(y), 0), 10000),
  };
}

function normalizarPosicaoChatInterno(
  valor: unknown,
): PosicaoChatInternoAcessibilidade | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return null;
  }

  const objeto = valor as Record<string, unknown>;
  const x = Number(objeto.x);
  const y = Number(objeto.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.min(Math.max(Math.round(x), 0), 10000),
    y: Math.min(Math.max(Math.round(y), 0), 10000),
  };
}

export function normalizarPreferenciasAcessibilidade(
  valor: unknown,
): PreferenciasAcessibilidade {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return PREFERENCIAS_ACESSIBILIDADE_PADRAO;
  }

  const objeto = valor as Record<string, unknown>;

  return {
    tema: normalizarTema(objeto.tema),
    temaVisual: normalizarTemaVisual(objeto.temaVisual),
    tamanhoFonte: normalizarTamanhoFonte(objeto.tamanhoFonte),
    fonteDislexia: objeto.fonteDislexia === true,
    altoContraste: objeto.altoContraste === true,
    vlibrasPosicao: normalizarPosicaoVlibras(objeto.vlibrasPosicao),
    chatInternoPosicao: normalizarPosicaoChatInterno(objeto.chatInternoPosicao),
  };
}
