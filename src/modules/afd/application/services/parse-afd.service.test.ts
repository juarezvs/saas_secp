import { describe, expect, it } from "vitest";

import { parseLinhaAfd } from "./parse-afd.service";

describe("parseLinhaAfd", () => {
  it("reconhece identificador tipo 3 como CPF quando os digitos verificadores sao validos", () => {
    const marcacao = parseLinhaAfd(
      "00000318032025-12-02T16:36:00-0300050526596368243e",
    );

    expect(marcacao).toMatchObject({
      nsr: "000003180",
      cpf: "50526596368",
      pis: null,
      tipoRegistro: "3",
    });
  });

  it("reconhece identificador tipo 3 como PIS quando nao e CPF valido", () => {
    const marcacao = parseLinhaAfd(
      "00000055232025-02-21T13:25:00-0300017050352959d481",
    );

    expect(marcacao).toMatchObject({
      nsr: "000000552",
      cpf: null,
      pis: "17050352959",
      tipoRegistro: "3",
    });
  });
});
