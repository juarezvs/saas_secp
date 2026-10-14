import { describe, expect, it } from "vitest";
import { intervaloCompetencia } from "./processar-competencia-shadow.service";

describe("processamento de competência SHADOW", () => {
  it("calcula o intervalo mensal em UTC", () => {
    expect(intervaloCompetencia("2026-09")).toEqual({ inicio: new Date("2026-09-01T00:00:00.000Z"), fim: new Date("2026-10-01T00:00:00.000Z") });
  });
  it("rejeita competência inválida", () => { expect(() => intervaloCompetencia("2026-13")).toThrow("Competência inválida"); });
});
