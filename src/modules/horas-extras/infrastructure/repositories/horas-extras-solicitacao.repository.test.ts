import { describe, expect, it } from "vitest";

import { escolherConfiguracaoMaisEspecifica } from "./horas-extras-solicitacao.repository";

describe("horas-extras configuracao por escopo", () => {
  it("prefere a configuracao da unidade mais especifica", () => {
    const versao = escolherConfiguracaoMaisEspecifica(
      [
        { id: "geral", scopeUnitId: null, version: 9 },
        { id: "pai", scopeUnitId: "unidade-pai", version: 2 },
        { id: "filha", scopeUnitId: "unidade-filha", version: 1 },
      ],
      ["unidade-filha", "unidade-pai"],
    );

    expect(versao?.id).toBe("filha");
  });

  it("usa a configuracao da unidade superior antes do geral do orgao", () => {
    const versao = escolherConfiguracaoMaisEspecifica(
      [
        { id: "geral", scopeUnitId: null, version: 9 },
        { id: "pai", scopeUnitId: "unidade-pai", version: 2 },
      ],
      ["unidade-filha", "unidade-pai"],
    );

    expect(versao?.id).toBe("pai");
  });

  it("usa a configuracao geral do orgao quando nao ha escopo de unidade", () => {
    const versao = escolherConfiguracaoMaisEspecifica(
      [{ id: "geral", scopeUnitId: null, version: 9 }],
      ["unidade-filha", "unidade-pai"],
    );

    expect(versao?.id).toBe("geral");
  });
});
