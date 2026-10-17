export function campanhasHorasExtrasHabilitadas(orgaoId: string) {
  return process.env.HORAS_EXTRAS_CAMPANHAS_ENABLED === "true" &&
    (process.env.HORAS_EXTRAS_CAMPANHAS_ORGAOS ?? "").split(",").map((id) => id.trim()).filter(Boolean).includes(orgaoId);
}

export function exigirCampanhasHorasExtrasHabilitadas(orgaoId: string) {
  if (!campanhasHorasExtrasHabilitadas(orgaoId)) {
    throw new Error("Campanhas de horas extras indisponiveis para o orgao: funcionalidade pendente de homologacao.");
  }
}
