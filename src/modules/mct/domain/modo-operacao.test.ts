import { describe, expect, it } from "vitest";
import { resolverModoOperacaoMct } from "./modo-operacao";

describe("resolverModoOperacaoMct", () => {
  it("usa LEGACY por padrao e permite SHADOW", () => {
    expect(resolverModoOperacaoMct({})).toBe("LEGACY");
    expect(resolverModoOperacaoMct({ solicitado: "SHADOW" })).toBe("SHADOW");
  });

  it("bloqueia MCT oficial sem autorizacao explicita", () => {
    expect(() => resolverModoOperacaoMct({ solicitado: "MCT" })).toThrow(
      "piloto ainda nao autorizado",
    );
  });

  it("nunca permite reprocessamento oficial de competencia homologada", () => {
    expect(() =>
      resolverModoOperacaoMct({
        solicitado: "MCT",
        permitirModoOficial: true,
        competenciaHomologada: true,
      }),
    ).toThrow("competencia homologada");
  });
});

