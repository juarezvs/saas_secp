import { describe, expect, it } from "vitest";

import {
  calcularMinutosCoberturaSolicitacaoNoDia,
  listarDatasImpactadasSolicitacao,
} from "./periodo-solicitacao.service";

describe("periodo-solicitacao.service", () => {
  it("trata dataReferencia como data civil UTC ao calcular cobertura diaria", () => {
    const periodo = {
      dataInicio: new Date("2026-06-01T04:00:00.000Z"),
      dataFim: new Date("2026-06-04T04:00:00.000Z"),
    };
    const fusoHorario = "America/Manaus";

    expect(
      calcularMinutosCoberturaSolicitacaoNoDia(
        periodo,
        new Date("2026-06-01T00:00:00.000Z"),
        fusoHorario,
      ),
    ).toBe(24 * 60);
    expect(
      calcularMinutosCoberturaSolicitacaoNoDia(
        periodo,
        new Date("2026-06-03T00:00:00.000Z"),
        fusoHorario,
      ),
    ).toBe(24 * 60);
    expect(
      calcularMinutosCoberturaSolicitacaoNoDia(
        periodo,
        new Date("2026-06-04T00:00:00.000Z"),
        fusoHorario,
      ),
    ).toBe(0);
  });

  it("lista apenas as datas civis inclusivas do periodo informado", () => {
    const datas = listarDatasImpactadasSolicitacao(
      {
        dataInicio: new Date("2026-06-01T04:00:00.000Z"),
        dataFim: new Date("2026-06-04T04:00:00.000Z"),
      },
      "America/Manaus",
    ).map((data) => data.toISOString().slice(0, 10));

    expect(datas).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });
});
