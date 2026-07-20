import { afterEach, describe, expect, it, vi } from "vitest";

import { dataLimiteMovimentos } from "./regerar-banco-horas-mes.service";

describe("dataLimiteMovimentos", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("limita movimentos da competencia atual ao dia anterior no fuso do servidor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));

    const limite = dataLimiteMovimentos({
      anoReferencia: 2026,
      mesReferencia: 7,
      fusoHorario: "America/Manaus",
    });

    expect(limite.toISOString()).toBe("2026-07-19T23:59:59.999Z");
  });

  it("nao inclui nenhum dia quando a competencia ainda nao comecou", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));

    const limite = dataLimiteMovimentos({
      anoReferencia: 2026,
      mesReferencia: 8,
      fusoHorario: "America/Manaus",
    });

    expect(limite.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("inclui toda a competencia quando o mes ja terminou", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));

    const limite = dataLimiteMovimentos({
      anoReferencia: 2026,
      mesReferencia: 7,
      fusoHorario: "America/Manaus",
    });

    expect(limite.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });
});
