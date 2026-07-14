import { describe, expect, it } from "vitest";

import { autorizarBearerToken } from "./auth";
import { normalizarRotaParaMetricas, obterObservabilidade } from "./metrics";

describe("observabilidade", () => {
  it("mantem um registry singleton para evitar metricas duplicadas", () => {
    const primeiro = obterObservabilidade();
    const segundo = obterObservabilidade();

    expect(segundo.registry).toBe(primeiro.registry);
  });

  it("normaliza ids em rotas antes de usar labels", () => {
    expect(
      normalizarRotaParaMetricas(
        "/auditoria/298e0b40-00fc-40d0-a53f-c0a667eee01d",
      ),
    ).toBe("/auditoria/:id");
    expect(normalizarRotaParaMetricas("/servidores/123/foto")).toBe(
      "/servidores/:id/foto",
    );
  });

  it("valida bearer token com comparacao segura", () => {
    expect(autorizarBearerToken("Bearer segredo", "segredo")).toBe(true);
    expect(autorizarBearerToken("Bearer outro", "segredo")).toBe(false);
    expect(autorizarBearerToken(null, "segredo")).toBe(false);
  });
});
