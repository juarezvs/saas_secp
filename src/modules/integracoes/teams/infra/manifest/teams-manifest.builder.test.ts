import { describe, expect, it } from "vitest";

import { gerarTeamsManifest } from "./teams-manifest.builder";

describe("teams-manifest.builder", () => {
  it("gera manifesto Teams com bot, abas e dominio valido", () => {
    const manifest = gerarTeamsManifest({
      microsoftAppId: "11111111-1111-1111-1111-111111111111",
      botEndpoint: "https://secp.am.trf1.gov.br/api/bot/teams/messages",
      urlPublicaSecp: "https://secp.am.trf1.gov.br",
      abasTeamsAtivas: true,
      botConversacionalAtivo: true,
    });

    expect(manifest.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(manifest.validDomains).toContain("secp.am.trf1.gov.br");
    expect(manifest.bots).toHaveLength(1);
    expect(manifest.staticTabs).toHaveLength(6);
  });
});
