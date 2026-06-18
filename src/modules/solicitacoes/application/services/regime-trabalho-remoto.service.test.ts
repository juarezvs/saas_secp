import { describe, expect, it } from "vitest";

import {
  diaSemanaDaDataReferencia,
  extrairRegimeTrabalhoRemoto,
  regimeTrabalhoRemotoCobreData,
} from "./regime-trabalho-remoto.service";

describe("regime-trabalho-remoto.service", () => {
  it("extrai regime de teletrabalho total", () => {
    const regime = extrairRegimeTrabalhoRemoto({
      regimeTrabalhoRemoto: {
        tipo: "TOTAL",
      },
    });

    expect(regime?.tipo).toBe("TOTAL");
    expect(regime?.diasRemotos).toContain("SEGUNDA");
  });

  it("extrai dias remotos do regime hibrido", () => {
    const regime = extrairRegimeTrabalhoRemoto({
      regimeTrabalhoRemoto: {
        tipo: "HIBRIDO",
        diasRemotos: ["SEGUNDA", "QUARTA"],
      },
    });

    expect(regime).toEqual({
      tipo: "HIBRIDO",
      diasRemotos: ["SEGUNDA", "QUARTA"],
    });
  });

  it("identifica cobertura por dia da semana", () => {
    const segunda = new Date("2026-06-15T00:00:00.000Z");
    const terca = new Date("2026-06-16T00:00:00.000Z");
    const regime = {
      tipo: "HIBRIDO" as const,
      diasRemotos: ["SEGUNDA" as const],
    };

    expect(diaSemanaDaDataReferencia(segunda)).toBe("SEGUNDA");
    expect(regimeTrabalhoRemotoCobreData({ regime, dataReferencia: segunda }))
      .toBe(true);
    expect(regimeTrabalhoRemotoCobreData({ regime, dataReferencia: terca }))
      .toBe(false);
  });
});
