import { parseIsoDateOnly } from "./horas-extras-datas.service";

export type HoraExtraReconhecidaParaRemuneracao = {
  data: string;
  minutos: number;
  tipoDia?: string;
};

export type VigenciaRemuneratoriaHoraExtra = {
  id: string;
  inicio: string;
  fim?: string;
  remuneracaoBaseCentavos: number;
  origem: "SARH" | "SNAPSHOT" | "MANUAL";
};

export type BlocoRemuneratorioHoraExtra = {
  vigenciaId: string;
  inicio: string;
  fim?: string;
  remuneracaoBaseCentavos: number;
  origem: VigenciaRemuneratoriaHoraExtra["origem"];
  minutos: number;
  datas: HoraExtraReconhecidaParaRemuneracao[];
};

function compararData(a: string, b: string) {
  return a.localeCompare(b);
}

function vigenciaContemData(
  vigencia: VigenciaRemuneratoriaHoraExtra,
  data: string,
) {
  return (
    compararData(data, vigencia.inicio) >= 0 &&
    (!vigencia.fim || compararData(data, vigencia.fim) <= 0)
  );
}

export function segmentarHorasExtrasPorVigenciaRemuneratoria(params: {
  horasReconhecidas: HoraExtraReconhecidaParaRemuneracao[];
  vigencias: VigenciaRemuneratoriaHoraExtra[];
}): BlocoRemuneratorioHoraExtra[] {
  const vigenciasOrdenadas = [...params.vigencias].sort((a, b) =>
    compararData(a.inicio, b.inicio),
  );
  const blocos = new Map<string, BlocoRemuneratorioHoraExtra>();
  const ids = new Set<string>();

  for (const [index, vigencia] of vigenciasOrdenadas.entries()) {
    parseIsoDateOnly(vigencia.inicio);
    if (vigencia.fim) parseIsoDateOnly(vigencia.fim);
    if (!vigencia.id || ids.has(vigencia.id)) {
      throw new Error("Identificador de vigencia remuneratoria ausente ou duplicado.");
    }
    ids.add(vigencia.id);
    if (vigencia.fim && vigencia.fim < vigencia.inicio) {
      throw new Error("Fim da vigencia remuneratoria anterior ao inicio.");
    }
    if (!Number.isSafeInteger(vigencia.remuneracaoBaseCentavos) || vigencia.remuneracaoBaseCentavos <= 0) {
      throw new Error("Remuneracao-base deve ser positiva e expressa em centavos inteiros.");
    }
    const anterior = vigenciasOrdenadas[index - 1];
    if (anterior && (!anterior.fim || anterior.fim >= vigencia.inicio)) {
      throw new Error("Vigencias remuneratorias sobrepostas. Regularize o historico antes de calcular.");
    }
  }

  for (const hora of [...params.horasReconhecidas].sort((a, b) =>
    compararData(a.data, b.data),
  )) {
    parseIsoDateOnly(hora.data);
    if (!Number.isSafeInteger(hora.minutos) || hora.minutos <= 0) {
      throw new Error("Horas reconhecidas devem possuir minutos inteiros positivos.");
    }

    const vigencia = vigenciasOrdenadas.find((item) =>
      vigenciaContemData(item, hora.data),
    );

    if (!vigencia) {
      throw new Error(`Remuneracao sem vigencia para a data ${hora.data}.`);
    }

    const blocoExistente = blocos.get(vigencia.id);
    const bloco =
      blocoExistente ??
      ({
        vigenciaId: vigencia.id,
        inicio: vigencia.inicio,
        fim: vigencia.fim,
        remuneracaoBaseCentavos: vigencia.remuneracaoBaseCentavos,
        origem: vigencia.origem,
        minutos: 0,
        datas: [],
      } satisfies BlocoRemuneratorioHoraExtra);

    bloco.minutos += hora.minutos;
    bloco.datas.push(hora);
    blocos.set(vigencia.id, bloco);
  }

  return [...blocos.values()];
}
