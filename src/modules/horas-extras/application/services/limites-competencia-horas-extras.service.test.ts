import { describe, expect, it } from "vitest";

import { validateOvertimeRequestedDays } from "./validar-solicitacao-horas-extras.service";

const entrada = {
  periodStart: "2026-01-01", periodEnd: "2027-12-31",
  policy: { dailyLimitMinutesByDayType: {}, monthlyLimitMinutes: 2640, annualLimitMinutes: 12000 },
};

describe("limites por competencia na solicitacao", () => {
  it("nao mistura meses diferentes no limite mensal", () => {
    expect(validateOvertimeRequestedDays({ ...entrada, days: [
      { date: "2026-10-01", requestedMinutes: 1500 },
      { date: "2026-11-01", requestedMinutes: 1500 },
    ] })).toEqual([]);
  });
  it("soma os dias do mesmo mes e identifica a competencia excedida", () => {
    expect(validateOvertimeRequestedDays({ ...entrada, days: [
      { date: "2026-10-01", requestedMinutes: 1500 },
      { date: "2026-10-02", requestedMinutes: 1500 },
    ] })).toMatchObject([{ code: "LIMITE_MENSAL_EXCEDIDO", date: "2026-10-01", requestedMinutes: 3000 }]);
  });
  it("aplica o limite anual configurado e nao mistura exercicios", () => {
    const days = Array.from({ length: 5 }, (_, index) => ({
      date: `2026-0${index + 1}-01`, requestedMinutes: 2500,
    }));
    expect(validateOvertimeRequestedDays({ ...entrada, days })).toMatchObject([
      { code: "LIMITE_ANUAL_EXCEDIDO", date: "2026-01-01", requestedMinutes: 12500, allowedMinutes: 12000 },
    ]);
    expect(validateOvertimeRequestedDays({ ...entrada, days: [
      { date: "2026-12-01", requestedMinutes: 2500 },
      { date: "2027-01-01", requestedMinutes: 2500 },
    ] })).toEqual([]);
  });
  it("mantem limites historicos da politica recebida, sem reescrever sua vigencia", () => {
    const issues = validateOvertimeRequestedDays({
      ...entrada, policy: { dailyLimitMinutesByDayType: {}, annualLimitMinutes: 8040 },
      days: [{ date: "2026-01-01", requestedMinutes: 9000 }],
    });
    expect(issues).toMatchObject([{ code: "LIMITE_ANUAL_EXCEDIDO", allowedMinutes: 8040 }]);
  });
  it("reporta data inexistente e quantidade invalida sem normaliza-las para outro mes", () => {
    const issues = validateOvertimeRequestedDays({ ...entrada, days: [
      { date: "2026-02-30", requestedMinutes: 3000 },
      { date: "2026-10-01", requestedMinutes: NaN },
    ] });
    expect(issues.map((issue) => issue.code)).toEqual(["DATA_INVALIDA", "QUANTIDADE_INVALIDA"]);
  });
});
