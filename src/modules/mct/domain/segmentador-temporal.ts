import type { IntervaloTrabalhado, SegmentoTemporal } from "./mct.types";
import { duracaoMinutos } from "./tempo";

export type MarcoSegmentacao = {
  instante: Date;
  codigo: string;
};

export function segmentarIntervalos(params: {
  intervalos: IntervaloTrabalhado[];
  marcos?: MarcoSegmentacao[];
}): SegmentoTemporal[] {
  const segmentos: SegmentoTemporal[] = [];

  for (const intervalo of params.intervalos) {
    const fronteiras = new Map<number, string[]>();
    fronteiras.set(intervalo.inicio.getTime(), ["INICIO_TRABALHO"]);
    fronteiras.set(intervalo.fim.getTime(), ["FIM_TRABALHO"]);

    for (const marco of params.marcos ?? []) {
      const instante = marco.instante.getTime();
      if (
        instante > intervalo.inicio.getTime() &&
        instante < intervalo.fim.getTime()
      ) {
        fronteiras.set(instante, [
          ...(fronteiras.get(instante) ?? []),
          marco.codigo,
        ]);
      }
    }

    const instantes = [...fronteiras.keys()].sort((a, b) => a - b);
    for (let indice = 0; indice < instantes.length - 1; indice++) {
      const segmento = {
        inicio: new Date(instantes[indice]),
        fim: new Date(instantes[indice + 1]),
      };
      segmentos.push({
        ...segmento,
        indice: segmentos.length,
        minutos: duracaoMinutos(segmento),
        ativo: true,
        marcadores: fronteiras.get(instantes[indice]) ?? [],
      });
    }
  }

  return segmentos;
}

