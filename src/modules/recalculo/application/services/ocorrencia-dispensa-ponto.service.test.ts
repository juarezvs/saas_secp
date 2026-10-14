import { describe, expect, it } from "vitest";

import { descricaoOcorrenciaDispensaPonto } from "./ocorrencia-dispensa-ponto.service";

describe("descricaoOcorrenciaDispensaPonto", () => {
  it("inclui motivo, ato autorizativo e processo SEI", () => {
    expect(
      descricaoOcorrenciaDispensaPonto({
        motivo: "Teletrabalho",
        atoAutorizativo: "25878812",
        processoSei: "0003419-05.2026.4.01.8002",
      }),
    ).toBe(
      "Dispensa de ponto: Teletrabalho | Ato autorizativo: 25878812 | Processo SEI: 0003419-05.2026.4.01.8002",
    );
  });

  it("omite identificadores que nao foram informados", () => {
    expect(
      descricaoOcorrenciaDispensaPonto({
        motivo: "Dispensa institucional",
        atoAutorizativo: null,
        processoSei: null,
      }),
    ).toBe("Dispensa de ponto: Dispensa institucional");
  });
});
