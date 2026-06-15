import { describe, expect, it } from "vitest";

import {
  TransicaoBoletimInvalidaError,
  validarTransicaoBoletimFrequencia,
} from "./validar-transicao-boletim-frequencia";

describe("validarTransicaoBoletimFrequencia", () => {
  it.each([
    ["GERADO", "ENCAMINHADO_SECAP"],
    ["ENCAMINHADO_SECAP", "RECEBIDO_SECAP"],
    ["RECEBIDO_SECAP", "CONFERIDO"],
  ] as const)("aceita a transição %s -> %s", (origem, destino) => {
    expect(() =>
      validarTransicaoBoletimFrequencia(origem, destino),
    ).not.toThrow();
  });

  it.each([
    ["GERADO", "RECEBIDO_SECAP"],
    ["GERADO", "CONFERIDO"],
    ["ENCAMINHADO_SECAP", "CONFERIDO"],
    ["CONFERIDO", "ENCAMINHADO_SECAP"],
  ] as const)("rejeita a transição %s -> %s", (origem, destino) => {
    expect(() => validarTransicaoBoletimFrequencia(origem, destino)).toThrow(
      TransicaoBoletimInvalidaError,
    );
  });
});
