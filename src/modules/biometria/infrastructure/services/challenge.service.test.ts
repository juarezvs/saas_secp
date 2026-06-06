import { describe, expect, it } from "vitest";

import {
  criarNonceEnrollment,
  criarSequenciaDesafios,
  hashNonceEnrollment,
  nonceCorresponde,
} from "./challenge.service";

describe("challenge.service", () => {
  it("gera tres desafios unicos com ordem consistente", () => {
    const desafios = criarSequenciaDesafios();

    expect(desafios).toHaveLength(3);
    expect(new Set(desafios.map((item) => item.tipo)).size).toBe(3);
    expect(desafios.map((item) => item.ordem)).toEqual([1, 2, 3]);
  });

  it("valida o nonce pelo hash sem armazenar o valor aberto", () => {
    const nonce = criarNonceEnrollment();
    const hash = hashNonceEnrollment(nonce);

    expect(hash).not.toContain(nonce);
    expect(nonceCorresponde(nonce, hash)).toBe(true);
    expect(nonceCorresponde(`${nonce}x`, hash)).toBe(false);
  });
});
