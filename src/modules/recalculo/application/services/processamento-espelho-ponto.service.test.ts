import { describe, expect, it } from "vitest";

import { processamentoAtualizadoHoje } from "./processamento-espelho-ponto.service";

describe("processamentoAtualizadoHoje", () => {
  it("respeita a virada do dia no fuso de Manaus", () => {
    const agora = new Date("2026-09-18T01:00:00.000Z");
    const processamento = {
      status: "ATUALIZADO",
      concluidoEm: new Date("2026-09-17T12:00:00.000Z"),
    };

    expect(
      processamentoAtualizadoHoje(processamento, "America/Manaus", agora),
    ).toBe(true);
  });

  it("considera pendencias e falhas como desatualizadas", () => {
    const agora = new Date("2026-09-17T18:00:00.000Z");

    expect(
      processamentoAtualizadoHoje(
        { status: "PENDENTE", concluidoEm: agora },
        "America/Manaus",
        agora,
      ),
    ).toBe(false);
  });
});
