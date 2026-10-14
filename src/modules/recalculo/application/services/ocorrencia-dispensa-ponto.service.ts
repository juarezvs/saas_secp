type DispensaPontoParaOcorrencia = {
  motivo: string;
  atoAutorizativo: string | null;
  processoSei: string | null;
};

export function descricaoOcorrenciaDispensaPonto(
  dispensa: DispensaPontoParaOcorrencia,
) {
  return [
    `Dispensa de ponto: ${dispensa.motivo}`,
    dispensa.atoAutorizativo
      ? `Ato autorizativo: ${dispensa.atoAutorizativo}`
      : null,
    dispensa.processoSei ? `Processo SEI: ${dispensa.processoSei}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
