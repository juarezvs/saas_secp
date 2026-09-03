import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  autenticarNoActiveDirectory: vi.fn(),
  buscarUsuarioParaLoginPorMatricula: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock(
  "../../infrastructure/active-directory/active-directory-auth.service",
  () => ({
    autenticarNoActiveDirectory: mocks.autenticarNoActiveDirectory,
  }),
);

vi.mock("../../infrastructure/repositories/usuario-auth.repository", () => ({
  buscarUsuarioParaLoginPorMatricula: mocks.buscarUsuarioParaLoginPorMatricula,
}));

import { autenticarUsuarioPorCredenciais } from "./autenticar-usuario.service";

function usuarioBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "usuario-1",
    matricula: "AM123",
    nome: "Usuario",
    email: "usuario@example.test",
    tipo: "SERVIDOR",
    preferenciasAcessibilidade: {},
    senhaHash: null,
    orgaoId: "orgao-am",
    orgaoIdsAutenticacao: ["orgao-am"],
    perfis: [{ id: "perfil-1", codigo: "SERVIDOR", permissoes: [] }],
    perfilAtivo: { id: "perfil-1", codigo: "SERVIDOR", permissoes: [] },
    ...overrides,
  };
}

describe("autenticarUsuarioPorCredenciais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_LOCAL_PASSWORD_FIRST;
    mocks.autenticarNoActiveDirectory.mockResolvedValue(true);
    mocks.compare.mockResolvedValue(false);
  });

  it("autentica usuario comum no AD do orgao principal", async () => {
    mocks.buscarUsuarioParaLoginPorMatricula.mockResolvedValue(usuarioBase());

    const usuario = await autenticarUsuarioPorCredenciais({
      matricula: "am123",
      senha: "senha",
    });

    expect(usuario?.matricula).toBe("AM123");
    expect(mocks.autenticarNoActiveDirectory).toHaveBeenCalledWith(
      "AM123",
      "senha",
      "orgao-am",
    );
  });

  it("autentica juiz nos ADs das seccionais vinculadas ao usuario", async () => {
    mocks.buscarUsuarioParaLoginPorMatricula.mockResolvedValue(
      usuarioBase({
        matricula: "JU123",
        orgaoId: null,
        orgaoIdsAutenticacao: ["orgao-df", "orgao-go"],
      }),
    );

    const usuario = await autenticarUsuarioPorCredenciais({
      matricula: "ju123",
      senha: "senha",
    });

    expect(usuario?.matricula).toBe("JU123");
    expect(mocks.autenticarNoActiveDirectory).toHaveBeenCalledWith(
      "JU123",
      "senha",
      ["orgao-df", "orgao-go"],
    );
  });
});
