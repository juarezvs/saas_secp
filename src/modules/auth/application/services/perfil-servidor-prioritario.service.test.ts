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

const perfisPessoaExterna = [
  {
    tipoUsuario: "ESTAGIARIO",
    perfil: {
      id: "perfil-estagiario",
      codigo: "ESTAGIARIO",
      nome: "Estagiário",
      permissoes: [],
    },
  },
  {
    tipoUsuario: "PRESTADOR",
    perfil: {
      id: "perfil-prestador",
      codigo: "PRESTADOR",
      nome: "Prestador",
      permissoes: [],
    },
  },
  {
    tipoUsuario: "VOLUNTARIO",
    perfil: {
      id: "perfil-voluntario",
      codigo: "VOLUNTARIO",
      nome: "Voluntário",
      permissoes: [],
    },
  },
];

describe("escolherPerfilInicial", () => {
  it("prioriza o perfil servidor no primeiro acesso de usuario servidor com multiplos perfis", () => {
    expect(
      escolherPerfilInicial({
        tipoUsuario: "SERVIDOR",
        perfis: [perfilGestor, perfilServidor],
      }),
    ).toEqual(perfilServidor);
  });

  it.each(perfisPessoaExterna)(
    "prioriza o perfil $tipoUsuario no primeiro acesso",
    ({ tipoUsuario, perfil }) => {
      expect(
        escolherPerfilInicial({
          tipoUsuario,
          perfis: [perfilGestor, perfil],
        }),
      ).toEqual(perfil);
    },
  );

  it("prioriza o perfil servidor quando nao ha troca manual na sessao", () => {
    expect(
      escolherPerfilInicial({
        tipoUsuario: "SERVIDOR",
        perfis: [perfilServidor, perfilGestor],
        perfilPreferido: perfilGestor,
      }),
    ).toEqual(perfilServidor);
  });

  it("respeita o perfil escolhido manualmente durante a sessao", () => {
    expect(
      escolherPerfilInicial({
        tipoUsuario: "SERVIDOR",
        perfis: [perfilServidor, perfilGestor],
        perfilPreferido: perfilGestor,
        respeitarPerfilPreferido: true,
      }),
    ).toEqual(perfilGestor);
  });
});
