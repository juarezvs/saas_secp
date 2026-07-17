import { describe, expect, it } from "vitest";

import {
  expandOvertimeDateSelection,
  mapClassificacaoInstitucionalParaOvertimeDayType,
} from "./horas-extras-datas.service";
import { validateOvertimeRequestedDays } from "./validar-solicitacao-horas-extras.service";
import { rubricaHorasExtrasPorPercentual } from "./horas-extras-folha.service";

const politicaJusticaFederalReferencia = {
  dailyLimitMinutesByDayType: {
    DIA_UTIL: 120,
    SABADO: 120,
    DOMINGO: 240,
  },
  monthlyLimitMinutes: 2640,
  annualLimitMinutes: 8040,
  normativeBasis: "Politica inicial de referencia da Justica Federal",
};

describe("horas-extras solicitacao", () => {
  it("expande recorrencia de sabados e domingos em datas explicitas", () => {
    expect(
      expandOvertimeDateSelection({
        mode: "SABADOS_DOMINGOS",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-12",
      }),
    ).toEqual(["2026-07-04", "2026-07-05", "2026-07-11", "2026-07-12"]);
  });

  it("valida o caso 01 com limite de duas horas em dias uteis", () => {
    const issues = validateOvertimeRequestedDays({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-20",
      policy: politicaJusticaFederalReferencia,
      days: [
        { date: "2026-07-12", requestedMinutes: 180 },
        { date: "2026-07-14", requestedMinutes: 240 },
        { date: "2026-07-16", requestedMinutes: 180 },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: "LIMITE_DIARIO_EXCEDIDO",
        date: "2026-07-14",
        allowedMinutes: 120,
        requestedMinutes: 240,
      }),
      expect.objectContaining({
        code: "LIMITE_DIARIO_EXCEDIDO",
        date: "2026-07-16",
        allowedMinutes: 120,
        requestedMinutes: 180,
      }),
    ]);
  });

  it("usa o tipo de dia classificado pelo calendario institucional para validar feriado", () => {
    const issues = validateOvertimeRequestedDays({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      policy: {
        dailyLimitMinutesByDayType: {
          DIA_UTIL: 120,
          FERIADO_ESTADUAL: 480,
        },
      },
      days: [
        {
          date: "2026-07-14",
          requestedMinutes: 300,
          dayType: "FERIADO_ESTADUAL",
        },
      ],
    });

    expect(issues).toEqual([]);
  });

  it("mapeia feriados reais do calendario para tipos de hora extra", () => {
    expect(
      mapClassificacaoInstitucionalParaOvertimeDayType({
        dataReferencia: new Date("2026-07-15T00:00:00.000Z"),
        tipo: "FERIADO",
        descricao: "Feriado estadual",
        fonte: "CALENDARIO_INSTITUCIONAL",
        abrangencia: "ESTADUAL",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
      }),
    ).toBe("FERIADO_ESTADUAL");

    expect(
      mapClassificacaoInstitucionalParaOvertimeDayType({
        dataReferencia: new Date("2026-12-20T00:00:00.000Z"),
        tipo: "RECESSO_FORENSE",
        descricao: "Recesso forense 2026",
        fonte: "RECESSO_FORENSE",
        contaComoDiaUtil: false,
        geraApuracaoRegular: false,
      }),
    ).toBe("RECESSO");
  });

  it("resolve rubrica de folha pelo percentual autorizado", () => {
    expect(rubricaHorasExtrasPorPercentual({ toString: () => "50" })).toBe(
      "HE_50",
    );
    expect(rubricaHorasExtrasPorPercentual({ toString: () => "100" })).toBe(
      "HE_100",
    );
  });
});
