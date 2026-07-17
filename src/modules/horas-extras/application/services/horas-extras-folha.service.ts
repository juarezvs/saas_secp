export type PercentualRubrica = {
  toString(): string;
};

export function rubricaHorasExtrasPorPercentual(ratePercent: PercentualRubrica) {
  const percentual = Number(ratePercent.toString());

  if (!Number.isFinite(percentual) || percentual <= 0) {
    throw new Error("Percentual de hora extra inválido para geração de folha.");
  }

  if (percentual >= 100) {
    return "HE_100";
  }

  return "HE_50";
}
