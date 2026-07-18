import { describe, expect, it } from "vitest";

import {
  calcularDiasAtePrazo,
  classificarPrazoBancoHoras,
} from "./classificar-prazo-banco-horas.service";

describe("classificar prazo do banco de horas", () => {
  const hoje = new Date("2026-07-18T12:00:00.000Z");

  it("classifica prazo inexistente como sem prazo", () => {
    expect(classificarPrazoBancoHoras({ prazo: null, hoje })).toBe("SEM_PRAZO");
  });

  it("classifica prazo vencido", () => {
    expect(
      classificarPrazoBancoHoras({
        prazo: new Date("2026-07-17T23:59:59.000Z"),
        hoje,
      }),
    ).toBe("VENCIDO");
  });

  it("classifica prazo urgente ate dez dias", () => {
    expect(
      classificarPrazoBancoHoras({
        prazo: new Date("2026-07-28T00:00:00.000Z"),
        hoje,
      }),
    ).toBe("URGENTE");
  });

  it("classifica prazo em atencao ate trinta dias", () => {
    expect(
      classificarPrazoBancoHoras({
        prazo: new Date("2026-08-17T00:00:00.000Z"),
        hoje,
      }),
    ).toBe("ATENCAO");
  });

  it("classifica prazo regular acima de trinta dias", () => {
    expect(
      classificarPrazoBancoHoras({
        prazo: new Date("2026-08-18T00:00:00.000Z"),
        hoje,
      }),
    ).toBe("REGULAR");
  });

  it("calcula dias inteiros ignorando horario", () => {
    expect(
      calcularDiasAtePrazo({
        prazo: new Date("2026-07-19T01:30:00.000Z"),
        hoje,
      }),
    ).toBe(1);
  });
});
