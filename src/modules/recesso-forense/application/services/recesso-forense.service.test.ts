import { describe, expect, it } from "vitest";

import {
  formatarPeriodoRecesso,
  obterPeriodoRecessoPorAno,
} from "./recesso-forense.service";

describe("recesso-forense.service", () => {
  it("formata o periodo do recesso pela data civil UTC", () => {
    const periodo = obterPeriodoRecessoPorAno(2026);

    expect(formatarPeriodoRecesso(periodo.inicio, periodo.fim)).toBe(
      "20/12/2026 a 06/01/2027",
    );
  });
});
