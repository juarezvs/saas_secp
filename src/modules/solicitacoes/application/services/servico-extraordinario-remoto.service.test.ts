import { describe, expect, it } from "vitest";

import {
  marcacaoPossuiRegistroBiometrico,
  todasMarcacoesSaoBiometricas,
} from "./servico-extraordinario-remoto.service";

describe("servico-extraordinario-remoto.service", () => {
  it("aceita fonte de equipamento biometrico", () => {
    expect(
      marcacaoPossuiRegistroBiometrico({ fonte: "EQUIPAMENTO_BIOMETRICO" }),
    ).toBe(true);
  });

  it("aceita marcacao web com validacao facial consumida", () => {
    expect(
      marcacaoPossuiRegistroBiometrico({
        fonte: "WEB",
        metadados: {
          biometriaValidadaNestaEtapa: true,
        },
      }),
    ).toBe(true);
  });

  it("rejeita conjunto com marcacao manual ou sem biometria", () => {
    expect(
      todasMarcacoesSaoBiometricas([
        { fonte: "WEB", metadados: { biometriaValidadaNestaEtapa: true } },
        { fonte: "MANUAL_ADMINISTRATIVO" },
      ]),
    ).toBe(false);
  });
});
