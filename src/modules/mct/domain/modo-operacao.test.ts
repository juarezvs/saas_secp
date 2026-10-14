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
        escopoExplicitamenteHabilitado: true,
        competenciaHomologada: true,
      }),
    ).toThrow("competencia homologada");
  });

  it("exige escopo explicito e escritor oficial unico", () => {
    expect(() => resolverModoOperacaoMct({ solicitado: "MCT", permitirModoOficial: true })).toThrow("escopo sem habilitacao");
    expect(() => resolverModoOperacaoMct({ solicitado: "MCT", permitirModoOficial: true, escopoExplicitamenteHabilitado: true, outroEscritorOficialAtivo: true })).toThrow("outro escritor oficial");
    expect(resolverModoOperacaoMct({ solicitado: "MCT", permitirModoOficial: true, escopoExplicitamenteHabilitado: true })).toBe("MCT");
  });
});

