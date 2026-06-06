import { beforeEach, describe, expect, it } from "vitest";

import {
  criptografarTemplateFacial,
  descriptografarTemplateFacial,
  hashTemplateFacial,
} from "./biometria-facial-crypto.service";

describe("biometria-facial-crypto.service", () => {
  beforeEach(() => {
    process.env.BIOMETRIA_FACIAL_ENCRYPTION_KEY =
      Buffer.alloc(32, 7).toString("base64");
    process.env.BIOMETRIA_FACIAL_TEMPLATE_PEPPER = "pepper-de-teste";
  });

  it("criptografa e recupera o template com AES-GCM", () => {
    const template = [0.1, 0.2, 0.3, 0.4];
    const protegido = criptografarTemplateFacial(template);

    expect(protegido.conteudo).not.toContain("0.1");
    expect(
      descriptografarTemplateFacial({
        conteudo: protegido.conteudo,
        iv: protegido.iv,
        tag: protegido.tag,
      }),
    ).toEqual(template);
  });

  it("gera hash deterministico com pepper", () => {
    expect(hashTemplateFacial([1, 2, 3])).toBe(
      hashTemplateFacial([1, 2, 3]),
    );
    expect(hashTemplateFacial([1, 2, 3])).not.toBe(
      hashTemplateFacial([1, 2, 4]),
    );
  });
});
