import { describe, expect, it } from "vitest";

import { MENU_CATALOGO } from "./menu-catalogo";
import {
  MENUS_PERFIS_ADMINISTRATIVOS,
  menuPadraoNovoPerfilAdministrativo,
} from "./menu-perfis-administrativos";

describe("menus dos perfis administrativos", () => {
  const idsCatalogo = new Set(MENU_CATALOGO.map((item) => item.id));

  for (const [codigo, menu] of Object.entries(MENUS_PERFIS_ADMINISTRATIVOS)) {
    it(`${codigo} usa somente itens válidos e sem duplicidade`, () => {
      const itens = [
        ...menu.itensRaiz,
        ...menu.grupos.flatMap((grupo) => grupo.itens),
      ];
      const ids = itens.map((item) => item.itemCatalogo);

      expect(ids.every((id) => idsCatalogo.has(id))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
      expect(menu.grupos.every((grupo) => grupo.itens.length > 0)).toBe(true);
    });
  }

  it("mantém rótulos de escopo próprios para administrador e master", () => {
    expect(MENUS_PERFIS_ADMINISTRATIVOS.ADMIN.itensRaiz[0]?.label).toBe(
      "Visão geral",
    );
    expect(MENUS_PERFIS_ADMINISTRATIVOS.MASTER.itensRaiz[0]?.label).toBe(
      "Visão global",
    );
    expect(
      MENUS_PERFIS_ADMINISTRATIVOS.ADMIN.grupos.some(
        (grupo) => grupo.label === "Configuração da Seccional",
      ),
    ).toBe(true);
    expect(
      MENUS_PERFIS_ADMINISTRATIVOS.MASTER.grupos.some(
        (grupo) => grupo.label === "Governança Global",
      ),
    ).toBe(true);
  });

  it("organiza servidor e chefia conforme o contexto de uso", () => {
    expect(
      MENUS_PERFIS_ADMINISTRATIVOS.SERVIDOR.grupos.map((grupo) => grupo.label),
    ).toContain("Minha Vida Funcional");
    expect(
      MENUS_PERFIS_ADMINISTRATIVOS.CHEFIA.grupos.map((grupo) => grupo.label),
    ).toContain("Gestão da Equipe");
  });

  it("usa o menu do administrador como modelo de novos perfis administrativos", () => {
    expect(menuPadraoNovoPerfilAdministrativo()).toBe(
      MENUS_PERFIS_ADMINISTRATIVOS.ADMIN,
    );
  });
});
