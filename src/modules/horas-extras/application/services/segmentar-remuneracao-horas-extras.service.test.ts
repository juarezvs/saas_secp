import { describe, expect, it } from "vitest";

import { segmentarHorasExtrasPorVigenciaRemuneratoria } from "./segmentar-remuneracao-horas-extras.service";

describe("segmentarHorasExtrasPorVigenciaRemuneratoria", () => {
  it("divide o calculo pela remuneracao vigente na data da hora extra", () => {
    const blocos = segmentarHorasExtrasPorVigenciaRemuneratoria({
      horasReconhecidas: [
        { data: "2026-08-05", minutos: 120 },
        { data: "2026-08-12", minutos: 180 },
        { data: "2026-08-18", minutos: 120 },
        { data: "2026-08-25", minutos: 240 },
      ],
      vigencias: [
        {
          id: "antiga",
          inicio: "2026-08-01",
          fim: "2026-08-14",
          remuneracaoBaseCentavos: 1000000,
          origem: "SARH",
        },
        {
          id: "nova",
          inicio: "2026-08-15",
          remuneracaoBaseCentavos: 1200000,
          origem: "SARH",
        },
      ],
    });

    expect(blocos).toMatchObject([
      { vigenciaId: "antiga", minutos: 300 },
      { vigenciaId: "nova", minutos: 360 },
    ]);
  });

  it("usa a nova remuneracao na data exata do inicio da vigencia", () => {
    const blocos = segmentarHorasExtrasPorVigenciaRemuneratoria({
      horasReconhecidas: [
        { data: "2026-08-14", minutos: 60 },
        { data: "2026-08-15", minutos: 60 },
      ],
      vigencias: [
        {
          id: "antiga",
          inicio: "2026-08-01",
          fim: "2026-08-14",
          remuneracaoBaseCentavos: 1000000,
          origem: "SARH",
        },
        {
          id: "nova",
          inicio: "2026-08-15",
          remuneracaoBaseCentavos: 1200000,
          origem: "SARH",
        },
      ],
    });

    expect(blocos[0]).toMatchObject({ vigenciaId: "antiga", minutos: 60 });
    expect(blocos[1]).toMatchObject({ vigenciaId: "nova", minutos: 60 });
  });

  it("falha explicitamente quando nao ha vigencia remuneratoria", () => {
    expect(() =>
      segmentarHorasExtrasPorVigenciaRemuneratoria({
        horasReconhecidas: [{ data: "2026-08-01", minutos: 60 }],
        vigencias: [],
      }),
    ).toThrow("Remuneracao sem vigencia para a data 2026-08-01.");
  });
});
