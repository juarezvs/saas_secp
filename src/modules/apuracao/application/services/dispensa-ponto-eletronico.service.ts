type ResolverDispensaPontoEletronicoParams = {
  cargoDescricao?: string | null;
  quantidadeEquipamentosAtivosUnidade?: number | null;
  dispensaAdministrativa?: {
    motivo: string;
    exigeFrequenciaManual?: boolean | null;
  } | null;
};

export type ResultadoDispensaPontoEletronico = {
  dispensado: boolean;
  motivos: string[];
  exigeFrequenciaManual: boolean;
};

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function servidorEhOficialJustica(cargoDescricao?: string | null) {
  if (!cargoDescricao) {
    return false;
  }

  const cargo = normalizarTexto(cargoDescricao);

  return cargo.includes("OFICIAL") && cargo.includes("JUSTICA");
}

export function resolverDispensaPontoEletronico({
  cargoDescricao,
  quantidadeEquipamentosAtivosUnidade,
  dispensaAdministrativa,
}: ResolverDispensaPontoEletronicoParams): ResultadoDispensaPontoEletronico {
  const motivos: string[] = [];
  let exigeFrequenciaManual = false;

  if (servidorEhOficialJustica(cargoDescricao)) {
    motivos.push("Servidor ocupante de cargo de oficial de justica.");
    exigeFrequenciaManual = true;
  }

  if (quantidadeEquipamentosAtivosUnidade === 0) {
    motivos.push("Unidade de lotacao sem equipamento biometrico ativo.");
    exigeFrequenciaManual = true;
  }

  if (dispensaAdministrativa) {
    motivos.push(`Dispensa administrativa: ${dispensaAdministrativa.motivo}.`);
    exigeFrequenciaManual =
      exigeFrequenciaManual ||
      dispensaAdministrativa.exigeFrequenciaManual !== false;
  }

  return {
    dispensado: motivos.length > 0,
    motivos,
    exigeFrequenciaManual,
  };
}
