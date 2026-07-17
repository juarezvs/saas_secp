import { describe, expect, it } from "vitest";

import {
  calcularExecucaoHorasExtras,
  somarExecucaoHorasExtras,
} from "./calcular-execucao-horas-extras.service";

function data(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("calcularExecucaoHorasExtras", () => {
  it("limita o executado aos minutos autorizados e aponta excedente", () => {
    const dias = calcularExecucaoHorasExtras({
      diasAutorizados: [
        {
          id: "dia-1",
          date: data("2026-01-05"),
          approvedMinutes: 120,
        },
      ],
      apuracoes: [
        {
          dataReferencia: data("2026-01-05"),
          minutosCredito: 150,
          status: "CALCULADA",
        },
      ],
    });

    expect(dias[0]).toMatchObject({
      executedMinutes: 120,
      pendingMinutes: 0,
      excessMinutes: 30,
      status: "EXCEDENTE",
    });
  });

  it("marca pendente quando a apuracao ainda nao foi calculada", () => {
    const dias = calcularExecucaoHorasExtras({
      diasAutorizados: [
        {
          id: "dia-1",
          date: data("2026-01-05"),
          approvedMinutes: 90,
        },
      ],
      apuracoes: [],
    });

    expect(dias[0]).toMatchObject({
      executedMinutes: 0,
      pendingMinutes: 90,
      status: "SEM_APURACAO",
    });
  });

  it("soma os totais da execucao", () => {
    const dias = calcularExecucaoHorasExtras({
      diasAutorizados: [
        { id: "dia-1", date: data("2026-01-05"), approvedMinutes: 120 },
        { id: "dia-2", date: data("2026-01-06"), approvedMinutes: 60 },
      ],
      apuracoes: [
        {
          dataReferencia: data("2026-01-05"),
          minutosCredito: 120,
          status: "CALCULADA",
        },
        {
          dataReferencia: data("2026-01-06"),
          minutosCredito: 30,
          status: "CALCULADA",
        },
      ],
    });

    expect(somarExecucaoHorasExtras(dias)).toEqual({
      approvedMinutes: 180,
      executedMinutes: 150,
      pendingMinutes: 30,
      excessMinutes: 0,
    });
  });
});
