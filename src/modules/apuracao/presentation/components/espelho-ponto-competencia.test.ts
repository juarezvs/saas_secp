import { describe, expect, it } from "vitest";

import {
  pertenceACompetencia,
  solicitacaoAfetaCompetencia,
} from "./espelho-ponto-competencia";

describe("limite da competencia no espelho de ponto", () => {
  it("aceita somente datas do mes selecionado", () => {
    expect(pertenceACompetencia("2026-10-31T00:00:00.000Z", 2026, 10)).toBe(
      true,
    );
    expect(pertenceACompetencia("2026-09-30T00:00:00.000Z", 2026, 10)).toBe(
      false,
    );
    expect(pertenceACompetencia("2026-11-01T00:00:00.000Z", 2026, 10)).toBe(
      false,
    );
  });

  it("nao inclui solicitacao de outra competencia pela data de criacao", () => {
    expect(
      solicitacaoAfetaCompetencia(
        {
          dataReferencia: "2026-09-30T00:00:00.000Z",
          dataInicio: null,
          dataFim: null,
        },
        2026,
        10,
      ),
    ).toBe(false);
  });

  it("inclui periodo que cruza a competencia selecionada", () => {
    expect(
      solicitacaoAfetaCompetencia(
        {
          dataReferencia: null,
          dataInicio: "2026-09-29T00:00:00.000Z",
          dataFim: "2026-10-02T00:00:00.000Z",
        },
        2026,
        10,
      ),
    ).toBe(true);
  });

  it("rejeita periodo inteiramente fora da competencia", () => {
    expect(
      solicitacaoAfetaCompetencia(
        {
          dataReferencia: null,
          dataInicio: "2026-09-01T00:00:00.000Z",
          dataFim: "2026-09-30T00:00:00.000Z",
        },
        2026,
        10,
      ),
    ).toBe(false);
  });
});
