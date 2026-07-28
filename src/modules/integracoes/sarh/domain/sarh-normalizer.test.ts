import { describe, expect, it } from "vitest";

import { normalizarCpf, normalizarPis } from "./sarh-normalizer";

describe("normalizador SARH", () => {
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
});
