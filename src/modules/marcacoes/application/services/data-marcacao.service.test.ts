import { describe, expect, it } from "vitest";

import { normalizarDataReferencia } from "../../../apuracao/application/services/calcular-tempo.service";

import {
  dataHoraLocalParaUtc,
  obterDataReferencia,
} from "./data-marcacao.service";

describe("data-marcacao.service", () => {
  it("obtém a data civil da marcação no fuso de Manaus", () => {
    const data = obterDataReferencia(new Date("2026-04-13T12:19:00.000Z"));

    expect(data.toISOString()).toBe("2026-04-13T00:00:00.000Z");
  });

  it("obtém a data civil da marcação no fuso de Tabatinga", () => {
    const data = obterDataReferencia(
      new Date("2026-06-23T04:30:00.000Z"),
      "America/Eirunepe",
    );

    expect(data.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });

  it("converte hora local da unidade para o instante UTC", () => {
    const dataHora = dataHoraLocalParaUtc({
      dataReferencia: new Date("2026-06-23T00:00:00.000Z"),
      hora: "08:43",
      fusoHorario: "America/Eirunepe",
    });

    expect(dataHora.toISOString()).toBe("2026-06-23T13:43:00.000Z");
  });

  it("preserva datas de referência armazenadas como data UTC", () => {
    const data = normalizarDataReferencia(
      new Date("2026-04-13T00:00:00.000Z"),
    );

    expect(data.toISOString()).toBe("2026-04-13T00:00:00.000Z");
  });
});
