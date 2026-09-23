import { describe, expect, it } from "vitest";

import {
  normalizarCpf,
  normalizarMatricula,
  normalizarPis,
} from "./sarh-normalizer";

describe("normalizador SARH", () => {
  it("remove zeros de preenchimento da matricula funcional", () => {
    expect(normalizarMatricula("MA009203")).toBe("MA9203");
    expect(normalizarMatricula("ma000123")).toBe("MA123");
    expect(normalizarMatricula("MA52351")).toBe("MA52351");
  });

  it("remove formatacao do CPF preservando zeros a esquerda", () => {
    expect(normalizarCpf("000.262.543-10")).toBe("00026254310");
    expect(normalizarCpf("227.598.163-20")).toBe("22759816320");
  });

  it("remove formatacao do PIS preservando zeros a esquerda", () => {
    expect(normalizarPis("000.262.543-10")).toBe("00026254310");
    expect(normalizarPis("227.598.163-20")).toBe("22759816320");
  });

  it("recompoe PIS numerico quando o SARH entrega sem zeros iniciais", () => {
    expect(normalizarPis(26254310)).toBe("00026254310");
  });

  it("remove zero extra de preenchimento quando o PIS vem com 12 digitos", () => {
    expect(normalizarPis("017050352959")).toBe("17050352959");
  });
});
