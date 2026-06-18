import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../calendario-institucional/application/services/classificar-dia-institucional.service",
  () => ({
    classificarDiaInstitucional: vi.fn(),
  }),
);

import {
  PrazoAjustePontoExpiradoError,
  verificarPrazoAjustePonto,
  verificarPrazoAjustePontoComCalendario,
} from "./verificar-prazo-ajuste-ponto.service";
import { classificarDiaInstitucional } from "../../../calendario-institucional/application/services/classificar-dia-institucional.service";

describe("verificar-prazo-ajuste-ponto.service", () => {
  beforeEach(() => {
    vi.mocked(classificarDiaInstitucional).mockReset();
  });

  it("permite ajuste de ponto enquanto o prazo do art. 17 ainda esta aberto", () => {
    const prazo = verificarPrazoAjustePonto({
      dataReferencia: new Date(2026, 4, 15),
      hoje: new Date(2026, 5, 8),
    });

    expect(prazo.situacao).toBe("NO_PRAZO");
  });

  it("bloqueia ajuste de ponto apos o prazo regulamentar", () => {
    expect(() =>
      verificarPrazoAjustePonto({
        dataReferencia: new Date(2026, 8, 21),
        hoje: new Date(2026, 9, 13),
      }),
    ).toThrowError(PrazoAjustePontoExpiradoError);
  });

  it("respeita o calendario institucional ao estender o prazo do ajuste de ponto", async () => {
    vi.mocked(classificarDiaInstitucional).mockImplementation(async (data) => {
      const iso = data.toISOString().slice(0, 10);

      if (iso === "2026-10-12") {
        return {
          dataReferencia: data,
          tipo: "PONTO_FACULTATIVO",
          descricao: "Ponto facultativo",
          fonte: "CALENDARIO_INSTITUCIONAL",
          contaComoDiaUtil: false,
          geraApuracaoRegular: false,
        };
      }

      const diaSemana = data.getDay();

      return {
        dataReferencia: data,
        tipo: diaSemana === 0 ? "DOMINGO" : diaSemana === 6 ? "SABADO" : "UTIL",
        descricao: null,
        fonte: "PADRAO",
        contaComoDiaUtil: diaSemana !== 0 && diaSemana !== 6,
        geraApuracaoRegular: diaSemana !== 0 && diaSemana !== 6,
      };
    });

    const prazo = await verificarPrazoAjustePontoComCalendario({
      dataReferencia: new Date(2026, 8, 21),
      hoje: new Date(2026, 9, 13),
    });

    expect(prazo.situacao).toBe("VENCE_HOJE");
  });
});
