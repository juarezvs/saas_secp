import { describe, expect, it } from "vitest";
import {
  calcularExcecoesPermissoesSeccionais,
  resolverPermissoesPerfilNaSeccional,
} from "./permissoes-perfil-seccional.service";

const permissao = (id: string) => ({
  permissaoId: id,
  permissao: { codigo: id },
});

describe("permissões de perfil por seccional", () => {
  it("aplica inclusões e remoções somente na seccional informada", () => {
    const resultado = resolverPermissoesPerfilNaSeccional(
      [permissao("base"), permissao("removida")],
      [
        { ...permissao("web"), orgaoId: "sjam", permitida: true },
        { ...permissao("removida"), orgaoId: "sjam", permitida: false },
        { ...permissao("outra"), orgaoId: "sjrr", permitida: true },
      ],
      "sjam",
    );

    expect(resultado).toEqual(["base", "web"]);
  });

  it("mantém a base global quando não há contexto seccional", () => {
    expect(
      resolverPermissoesPerfilNaSeccional(
        [permissao("base")],
        [{ ...permissao("web"), orgaoId: "sjam", permitida: true }],
        null,
      ),
    ).toEqual(["base"]);
  });

  it("persiste somente diferenças em relação à base", () => {
    expect(calcularExcecoesPermissoesSeccionais(["a", "b"], ["a", "c"]))
      .toEqual([
        { permissaoId: "c", permitida: true },
        { permissaoId: "b", permitida: false },
      ]);
  });
});
