import { describe, expect, it } from "vitest";

import {
  erroCampoAccessLogControlIdNaoSuportado,
  normalizarCpfControlId,
  parseLinhaAfdIdClass,
  parseLinhaCadastroAfdIdClass,
} from "./control-id-face-id.client";

describe("normalizarCpfControlId", () => {
  it("aceita CPF com digitos verificadores validos", () => {
    expect(normalizarCpfControlId("529.982.247-25")).toBe("52998224725");
  });

  it("aceita CPF com zero tecnico a esquerda quando o CPF resultante e valido", () => {
    expect(normalizarCpfControlId("052998224725")).toBe("52998224725");
  });

  it("rejeita sequencia de 11 digitos que nao e CPF valido", () => {
    expect(normalizarCpfControlId("04872396731")).toBeNull();
  });
});

describe("parseLinhaAfdIdClass", () => {
  it("le identificador AFD 671 com 12 digitos e reconhece CPF valido com zero inicial", () => {
    const marcacao = parseLinhaAfdIdClass(
      "00000318032025-12-02T16:36:00-0300050526596368243e",
    );

    expect(marcacao).toMatchObject({
      nsr: "3180",
      cpf: "50526596368",
      matricula: null,
      identificador: "050526596368",
    });
  });

  it("nao grava PIS do AFD 671 como CPF quando identificador nao e CPF valido", () => {
    const marcacao = parseLinhaAfdIdClass(
      "00000055232025-02-21T13:25:00-0300017050352959d481",
    );

    expect(marcacao).toMatchObject({
      nsr: "552",
      cpf: null,
      pis: "17050352959",
      matricula: null,
      identificador: "017050352959",
    });
  });
});

describe("parseLinhaCadastroAfdIdClass", () => {
  it("le registro cadastral AFD 671 e reconhece PIS com nome", () => {
    const cadastro = parseLinhaCadastroAfdIdClass(
      "00000037752025-02-20T10:32:00-0300I017050352959BERNARDO WANGHON MAIA JUNIOR                        200S11111111111ca4c",
    );

    expect(cadastro).toMatchObject({
      nsr: "377",
      tipoRegistro: "CADASTRO",
      tipoIdentificador: "PIS",
      pis: "17050352959",
      cpf: null,
      nome: "BERNARDO WANGHON MAIA JUNIOR",
      operacao: "INCLUSAO",
    });
  });
});

describe("erroCampoAccessLogControlIdNaoSuportado", () => {
  it("reconhece mensagem curta retornada por alguns Control iD", () => {
    expect(
      erroCampoAccessLogControlIdNaoSuportado(
        new Error(
          'Control iD HTTP 400: {"error":"confidence is not a column of table access_logs","code":1}',
        ),
      ),
    ).toBe(true);
  });
});
