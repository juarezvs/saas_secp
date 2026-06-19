import { describe, expect, it } from "vitest";
import { escolherPerfilInicial } from "./perfil-servidor-prioritario.service";

const perfilServidor = {
  id: "perfil-servidor",
  codigo: "SERVIDOR",
  nome: "Servidor",
  permissoes: [],
};

const perfilGestor = {
  id: "perfil-gestor",
  codigo: "GESTOR",
  nome: "Gestor",
  permissoes: [],
};

describe("escolherPerfilInicial", () => {
  it("prioriza o perfil servidor no primeiro acesso de usuario servidor com multiplos perfis", () => {
    expect(
      escolherPerfilInicial({
        tipoUsuario: "SERVIDOR",
        perfis: [perfilGestor, perfilServidor],
      }),
    ).toEqual(perfilServidor);
  });

  it("respeita uma escolha explicita de perfil", () => {
    expect(
      escolherPerfilInicial({
        tipoUsuario: "SERVIDOR",
        perfis: [perfilServidor, perfilGestor],
        perfilPreferido: perfilGestor,
      }),
    ).toEqual(perfilGestor);
  });
});
