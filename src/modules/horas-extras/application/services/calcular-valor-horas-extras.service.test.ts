import { describe, expect, it } from "vitest";

import { calcularValorHorasExtras } from "./calcular-valor-horas-extras.service";

describe("calcularValorHorasExtras", () => {
  it("calcula por vigencia remuneratoria e percentual do tipo de dia", () => {
    const resultado = calcularValorHorasExtras({
      divisorMinutos: 12000,
      horasReconhecidas: [
        { data: "2026-08-05", minutos: 120, tipoDia: "DIA_UTIL" },
        { data: "2026-08-18", minutos: 120, tipoDia: "DOMINGO" },
      ],
      vigenciasRemuneratorias: [
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
      regrasFinanceiras: [
        { tipoDia: "DIA_UTIL", percentual: 50, rubrica: "HE50" },
        { tipoDia: "DOMINGO", percentual: 100, rubrica: "HE100" },
      ],
    });

    expect(resultado.itens).toMatchObject([
      {
        data: "2026-08-05",
        vigenciaRemuneratoriaId: "antiga",
        valorCentavos: 15000,
      },
      {
        data: "2026-08-18",
        vigenciaRemuneratoriaId: "nova",
        valorCentavos: 24000,
      },
    ]);
    expect(resultado.totalCentavos).toBe(39000);
  });

  it("falha sem regra financeira para o tipo de dia", () => {
    expect(() =>
      calcularValorHorasExtras({
        divisorMinutos: 12000,
        horasReconhecidas: [
          { data: "2026-08-05", minutos: 60, tipoDia: "FERIADO_NACIONAL" },
        ],
        vigenciasRemuneratorias: [
          {
            id: "vigente",
            inicio: "2026-08-01",
            remuneracaoBaseCentavos: 1000000,
            origem: "SARH",
          },
        ],
        regrasFinanceiras: [{ tipoDia: "DIA_UTIL", percentual: 50 }],
      }),
    ).toThrow("Regra financeira ausente para FERIADO_NACIONAL.");
  });
});
