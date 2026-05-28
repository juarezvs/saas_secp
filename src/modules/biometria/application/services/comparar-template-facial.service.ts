export function normalizarVetor(vetor: number[]) {
  const norma = Math.sqrt(vetor.reduce((acc, valor) => acc + valor * valor, 0));

  if (!norma || !Number.isFinite(norma)) {
    throw new Error("Template facial com norma inválida.");
  }

  return vetor.map((valor) => valor / norma);
}

export function calcularSimilaridadeCosseno(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error("Templates faciais com dimensões diferentes.");
  }

  const vetorA = normalizarVetor(a);
  const vetorB = normalizarVetor(b);

  return vetorA.reduce((acc, valor, index) => acc + valor * vetorB[index], 0);
}

export function calcularDistanciaCosseno(a: number[], b: number[]) {
  const similaridade = calcularSimilaridadeCosseno(a, b);

  return 1 - similaridade;
}

export function calcularSimilaridadePorDistancia(distancia: number) {
  return Math.max(0, Math.min(1, 1 - distancia));
}

export function calcularTemplateMedio(amostras: number[][]) {
  if (amostras.length === 0) {
    throw new Error("Nenhuma amostra facial informada.");
  }

  const amostrasNormalizadas = amostras.map(normalizarVetor);
  const dimensao = amostrasNormalizadas[0].length;

  for (const amostra of amostrasNormalizadas) {
    if (amostra.length !== dimensao) {
      throw new Error("Amostras faciais com dimensões diferentes.");
    }
  }

  const media = Array.from({ length: dimensao }).map((_, index) => {
    const soma = amostrasNormalizadas.reduce(
      (acc, amostra) => acc + amostra[index],
      0,
    );

    return soma / amostrasNormalizadas.length;
  });

  return normalizarVetor(media);
}
