export type Instante = Date;

export type IntervaloTemporal = {
  inicio: Instante;
  fim: Instante;
};

export function criarIntervalo(
  inicio: Instante,
  fim: Instante,
): IntervaloTemporal {
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime())) {
    throw new Error("Intervalo temporal possui data invalida.");
  }

  if (inicio.getTime() >= fim.getTime()) {
    throw new Error("Intervalo temporal deve possuir inicio anterior ao fim.");
  }

  return { inicio: new Date(inicio), fim: new Date(fim) };
}

export function duracaoMinutos(intervalo: IntervaloTemporal) {
  return Math.floor(
    (intervalo.fim.getTime() - intervalo.inicio.getTime()) / 60_000,
  );
}

export function intervalosSobrepoem(
  primeiro: IntervaloTemporal,
  segundo: IntervaloTemporal,
) {
  return (
    primeiro.inicio.getTime() < segundo.fim.getTime() &&
    segundo.inicio.getTime() < primeiro.fim.getTime()
  );
}

export function intersecaoIntervalos(
  primeiro: IntervaloTemporal,
  segundo: IntervaloTemporal,
): IntervaloTemporal | null {
  const inicio = new Date(
    Math.max(primeiro.inicio.getTime(), segundo.inicio.getTime()),
  );
  const fim = new Date(
    Math.min(primeiro.fim.getTime(), segundo.fim.getTime()),
  );

  return inicio.getTime() < fim.getTime() ? criarIntervalo(inicio, fim) : null;
}

