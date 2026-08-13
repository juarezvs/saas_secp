import { describe, expect, it } from "vitest";

import {
  derivarStatusAutorizacaoPorServidores,
  exigirTransicaoAutorizacaoHoraExtra,
  listarProximosStatusAutorizacaoHoraExtra,
  podeTransicionarAutorizacaoHoraExtra,
} from "./maquina-estados-horas-extras";

describe("maquina de estados de horas extras", () => {
  it("permite registrar no SECP a partir de rascunho", () => {
    expect(
      podeTransicionarAutorizacaoHoraExtra("RASCUNHO", "REGISTRADA_NO_SECP"),
    ).toBe(true);
  });

  it("bloqueia transicoes arbitrarias", () => {
    expect(() =>
      exigirTransicaoAutorizacaoHoraExtra("RASCUNHO", "PAGA"),
    ).toThrow("Transicao invalida de RASCUNHO para PAGA.");
  });

  it("nao permite alterar fluxo pago ou cancelado", () => {
    expect(listarProximosStatusAutorizacaoHoraExtra("PAGA")).toEqual([]);
    expect(listarProximosStatusAutorizacaoHoraExtra("CANCELADA")).toEqual([]);
  });

  it("deriva pendencia global quando ha servidor com divergencia", () => {
    expect(
      derivarStatusAutorizacaoPorServidores(["ATESTADO", "COM_DIVERGENCIA"]),
    ).toBe("PENDENTE_AJUSTE");
  });

  it("deriva pronta para folha apenas quando todos estao prontos ou processados", () => {
    expect(
      derivarStatusAutorizacaoPorServidores([
        "PRONTO_PARA_FOLHA",
        "PROCESSADO_EM_FOLHA",
      ]),
    ).toBe("PRONTA_PARA_FOLHA");
  });
});
