import { describe, expect, it } from "vitest";

import { normalizarDataReferencia } from "../../../apuracao/application/services/calcular-tempo.service";

import { obterDataReferencia } from "./data-marcacao.service";

describe("data-marcacao.service", () => {
  it("obtém a data civil da marcação no fuso de Manaus", () => {
    const data = obterDataReferencia(new Date("2026-04-13T12:19:00.000Z"));

    expect(data.toISOString()).toBe("2026-04-13T00:00:00.000Z");
  });

  it("preserva datas de referência armazenadas como data UTC", () => {
    const data = normalizarDataReferencia(
      new Date("2026-04-13T00:00:00.000Z"),
    );

    expect(data.toISOString()).toBe("2026-04-13T00:00:00.000Z");
  });
});
