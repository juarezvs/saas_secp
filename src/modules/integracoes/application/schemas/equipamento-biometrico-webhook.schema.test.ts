import { describe, expect, it } from "vitest";

import { equipamentoBiometricoWebhookSchema } from "./integracao.schema";

describe("equipamentoBiometricoWebhookSchema", () => {
  it("aceita marcacao enviada por equipamento integrado", () => {
    const resultado = equipamentoBiometricoWebhookSchema.safeParse({
      equipamentoCodigo: "REP-01",
      tipoEvento: "MARCACAO",
      codigoEventoExterno: "evt-123",
      nsr: "987654",
      cpf: "123.456.789-09",
      dataHora: "2026-06-17T08:00:00-04:00",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.cpf).toBe("12345678909");
    }
  });

  it("exige identificacao do servidor para eventos de marcacao", () => {
    const resultado = equipamentoBiometricoWebhookSchema.safeParse({
      equipamentoCodigo: "REP-01",
      tipoEvento: "MARCACAO",
      dataHora: "2026-06-17T08:00:00-04:00",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.cpf?.[0]).toContain(
        "CPF ou matricula",
      );
    }
  });

  it("aceita heartbeat sem dados de marcacao", () => {
    const resultado = equipamentoBiometricoWebhookSchema.safeParse({
      equipamentoCodigo: "REP-01",
      tipoEvento: "HEARTBEAT",
      codigoEventoExterno: "hb-001",
    });

    expect(resultado.success).toBe(true);
  });

  it("rejeita data invalida em eventos de marcacao", () => {
    const resultado = equipamentoBiometricoWebhookSchema.safeParse({
      equipamentoCodigo: "REP-01",
      tipoEvento: "MARCACAO",
      matricula: "A123",
      dataHora: "ontem cedo",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.dataHora?.[0]).toContain(
        "data/hora valida",
      );
    }
  });
});
