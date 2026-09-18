import { describe, expect, it } from "vitest";

import { recortarHierarquiasPorSeccional } from "./minha-equipe.repository";

describe("recortarHierarquiasPorSeccional", () => {
  it("remove a raiz tecnica e os ramos de outras seccionais", () => {
    const unidades = [
      unidade("raiz-am", "SJTRF1AR", null, "org-am", "SJAM"),
      unidade("sj-am", "SJAM", "raiz-am", "org-am", "SJAM"),
      unidade("vara-am", "1VARA", "sj-am", "org-am", "SJAM"),
      unidade("sj-ro-em-am", "SJRO", "raiz-am", "org-am", "SJAM"),
      unidade("raiz-ro", "SJTRF1AR", null, "org-ro", "SJRO"),
      unidade("sj-ro", "SJRO", "raiz-ro", "org-ro", "SJRO"),
      unidade("vara-ro", "1VARA", "sj-ro", "org-ro", "SJRO"),
    ];

    expect(recortarHierarquiasPorSeccional(unidades)).toEqual([
      expect.objectContaining({ id: "sj-am", unidadePaiId: null }),
      expect.objectContaining({ id: "vara-am", unidadePaiId: "sj-am" }),
      expect.objectContaining({ id: "sj-ro", unidadePaiId: null }),
      expect.objectContaining({ id: "vara-ro", unidadePaiId: "sj-ro" }),
    ]);
  });
});

function unidade(
  id: string,
  sigla: string,
  unidadePaiId: string | null,
  orgaoId: string,
  orgaoSigla: string,
) {
  return {
    id,
    sigla,
    nome: sigla,
    unidadePaiId,
    orgaoId,
    orgao: { sigla: orgaoSigla },
  };
}
