import { describe, expect, it, vi } from "vitest";

import {
  criptografarTeamsSecret,
  descriptografarTeamsSecret,
} from "./teams-secret-crypto.service";

describe("teams-secret-crypto.service", () => {
  it("criptografa secret sem persistir texto puro", () => {
    vi.stubEnv("SECP_CRYPTO_KEY", "a".repeat(64));

    const criptografado = criptografarTeamsSecret("segredo-teams");

    expect(criptografado).not.toContain("segredo-teams");
    expect(descriptografarTeamsSecret(criptografado)).toBe("segredo-teams");
  });

  it("exige chave criptografica para salvar secret", () => {
    vi.stubEnv("SECP_CRYPTO_KEY", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");

    expect(() => criptografarTeamsSecret("segredo")).toThrow(
      "Configure SECP_CRYPTO_KEY",
    );
  });
});
