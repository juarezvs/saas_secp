import { describe, expect, it } from "vitest";
import { MODELOS_CONFIGURACAO_APURACAO, sugerirModelosConfiguracao } from "./modelos-configuracao-apuracao";

describe("modelos de configuração da apuração", () => {
  it("mantém códigos únicos e não embute parâmetros normativos", () => {
    const codigos = MODELOS_CONFIGURACAO_APURACAO.map((item) => item.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(MODELOS_CONFIGURACAO_APURACAO.every((item) => !("cargaMinutos" in item))).toBe(true);
  });

  it("sugere escalas cíclicas e o regime especial", () => {
    const codigos = sugerirModelosConfiguracao("ESCALA_CICLICA").map((item) => item.codigo);
    expect(codigos).toContain("ESCALA_12X36");
    expect(codigos).toContain("REGIME_ESPECIAL");
  });
});
