import { beforeEach, describe, expect, it, vi } from "vitest";

const configs = vi.hoisted(() => ({
  ambiente: {
    orgaoId: null,
    modoAutenticacao: "HTTP_AD_API",
    nome: "Ambiente",
    ativo: true,
    authUrl: "http://ad-ambiente/auth",
    ldapUrl: "",
    baseDn: "",
    dominio: "",
    bindDn: "",
    bindPassword: "",
    userDnPattern: "",
    searchFilter: "(sAMAccountName={{matricula}})",
    timeoutMs: 1000,
  },
  porOrgao: new Map<string | null, unknown>(),
}));

vi.mock(
  "@/modules/integracoes/application/services/ldap-active-directory-config.service",
  () => ({
    obterConfiguracaoLdapActiveDirectory: vi.fn((orgaoId?: string | null) =>
      Promise.resolve(configs.porOrgao.get(orgaoId ?? null)),
    ),
    obterConfiguracaoLdapActiveDirectoryAmbiente: vi.fn(
      () => configs.ambiente,
    ),
  }),
);

import { autenticarNoActiveDirectory } from "./active-directory-auth.service";

function config(orgaoId: string | null, authUrl: string) {
  return {
    ...configs.ambiente,
    orgaoId,
    nome: orgaoId ?? "Global",
    authUrl,
  };
}

describe("autenticarNoActiveDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configs.porOrgao.clear();
    configs.porOrgao.set("orgao-df", config("orgao-df", "http://ad-df/auth"));
    configs.porOrgao.set("orgao-go", config("orgao-go", "http://ad-go/auth"));
    configs.porOrgao.set(null, config(null, "http://ad-global/auth"));
  });

  it("tenta os ADs dos orgaos informados ate autenticar", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("ad-go")
          ? { username: "JU123", token: "token" }
          : { username: "JU123", token: "" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const autenticado = await autenticarNoActiveDirectory("JU123", "senha", [
      "orgao-df",
      "orgao-go",
    ]);

    expect(autenticado).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://ad-df/auth",
      "http://ad-go/auth",
    ]);
  });
});
