import { describe, expect, it } from "vitest";

import { calcularRastreamentoFifoBancoHoras } from "./rastrear-consumo-fifo-banco-horas.service";

describe("calcularRastreamentoFifoBancoHoras", () => {
  it("consome primeiro o crédito mais antigo", () => {
    const rastreamento = calcularRastreamentoFifoBancoHoras([
      {
        id: "credito-recente",
        tipo: "CREDITO",
        status: "VALIDADO",
        dataReferencia: new Date("2026-02-10T00:00:00.000Z"),
        expiraEm: new Date("2026-05-31T00:00:00.000Z"),
        minutos: 120,
      },
      {
        id: "credito-antigo",
        tipo: "CREDITO",
        status: "VALIDADO",
        dataReferencia: new Date("2026-01-10T00:00:00.000Z"),
        expiraEm: new Date("2026-04-30T00:00:00.000Z"),
        minutos: 60,
      },
      {
        id: "uso",
        tipo: "COMPENSACAO_CREDITO",
        status: "VALIDADO",
        dataReferencia: new Date("2026-03-01T00:00:00.000Z"),
        expiraEm: null,
        minutos: 90,
      },
    ]);

    expect(rastreamento.consumos.get("uso")).toEqual([
      { movimentoOrigemId: "credito-antigo", minutos: 60, tipoLote: "CREDITO" },
      { movimentoOrigemId: "credito-recente", minutos: 30, tipoLote: "CREDITO" },
    ]);
    expect(
      rastreamento.lotes.find((lote) => lote.movimentoId === "credito-antigo"),
    ).toMatchObject({
      minutosRestantes: 0,
      situacao: "COMPENSADO",
    });
    expect(
      rastreamento.lotes.find((lote) => lote.movimentoId === "credito-recente"),
    ).toMatchObject({
      minutosRestantes: 90,
    });
  });

  it("usa crédito novo para amortizar o débito mais antigo", () => {
    const rastreamento = calcularRastreamentoFifoBancoHoras([
      {
        id: "debito-antigo",
        tipo: "DEBITO",
        status: "VALIDADO",
        dataReferencia: new Date("2026-01-15T00:00:00.000Z"),
        expiraEm: new Date("2026-04-30T00:00:00.000Z"),
        minutos: 100,
      },
      {
        id: "credito-para-compensar",
        tipo: "COMPENSACAO_DEBITO",
        status: "VALIDADO",
        dataReferencia: new Date("2026-02-01T00:00:00.000Z"),
        expiraEm: null,
        minutos: 40,
      },
    ]);

    expect(rastreamento.consumos.get("credito-para-compensar")).toEqual([
      { movimentoOrigemId: "debito-antigo", minutos: 40, tipoLote: "DEBITO" },
    ]);
    expect(rastreamento.lotes[0]).toMatchObject({
      minutosOriginais: 100,
      minutosUtilizados: 40,
      minutosRestantes: 60,
    });
  });
});
