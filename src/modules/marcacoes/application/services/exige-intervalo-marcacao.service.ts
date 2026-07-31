function metadadosComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function exigeIntervaloDaApuracao(metadados: unknown) {
  const dados = metadadosComoObjeto(metadados);
  const jornadaSnapshot = metadadosComoObjeto(
    dados.jornadaSnapshotApuracao ?? dados.jornadaVigente,
  );
  const jornada = metadadosComoObjeto(jornadaSnapshot.jornada);

  return jornada.exigeIntervalo === false ? false : true;
}
