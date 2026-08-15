import { describe, expect, it } from "vitest";

import {
  descricaoMarcacao,
  marcacaoPossuiAjuste,
} from "../../application/services/espelho-marcacao-origem.service";

describe("EspelhoPontoMensal - origem visual da marcacao", () => {
  it("nao trata marcacao manual importada de equipamento como ajuste aplicado", () => {
    const marcacao = {
      id: "marcacao-equipamento-extra",
      dataHora: new Date("2026-02-20T15:08:41.000Z"),
      dataReferencia: new Date("2026-02-20T00:00:00.000Z"),
      tipo: "MANUAL",
      fonte: "EQUIPAMENTO_BIOMETRICO",
      status: "VALIDA",
      metadados: {
        origemBruta: "EQUIPAMENTO_BIOMETRICO",
        equipamentoCodigo: "SJAC_BIO_T_172_17_250_30",
        nsr: "935",
      },
    };

    expect(marcacaoPossuiAjuste(marcacao)).toBe(false);
    expect(descricaoMarcacao(marcacao)).toContain(
      "marcação complementar importada",
    );
    expect(descricaoMarcacao(marcacao)).not.toContain("ajuste aplicado");
  });

  it("continua tratando marcacao administrativa como ajuste aplicado", () => {
    const marcacao = {
      id: "marcacao-ajuste-solicitacao",
      dataHora: new Date("2026-02-20T15:08:41.000Z"),
      dataReferencia: new Date("2026-02-20T00:00:00.000Z"),
      tipo: "ENTRADA",
      fonte: "MANUAL_ADMINISTRATIVO",
      status: "AJUSTADA",
      metadados: {
        origem: "SOLICITACAO_DEFERIDA",
      },
    };

    expect(marcacaoPossuiAjuste(marcacao)).toBe(true);
    expect(descricaoMarcacao(marcacao)).toContain("ajuste aplicado");
  });
});
