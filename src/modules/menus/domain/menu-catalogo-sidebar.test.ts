import { describe, expect, it } from "vitest";

import {
  MENU_ITEMS_COM_PERMISSOES_CATALOGO,
  type MenuItem,
} from "@/components/layout/sidebar";
import { MENU_CATALOGO } from "./menu-catalogo";

function achatar(itens: MenuItem[]): MenuItem[] {
  return itens.flatMap((item) => [item, ...achatar(item.children ?? [])]);
}

describe("catálogo do menu lateral", () => {
  const itens = achatar(MENU_ITEMS_COM_PERMISSOES_CATALOGO);

  it("representa toda rota do catálogo no menu", () => {
    for (const itemCatalogo of MENU_CATALOGO) {
      expect(
        itens.some((item) => item.href === itemCatalogo.href),
        `Item ausente no menu: ${itemCatalogo.href}`,
      ).toBe(true);
    }
  });

  it("propaga todas as permissões do catálogo para o item visual", () => {
    for (const itemCatalogo of MENU_CATALOGO) {
      const itensDaRota = itens.filter(
        (item) => item.href === itemCatalogo.href,
      );
      const permissoes = new Set(
        itensDaRota.flatMap((item) => item.permissoes ?? []),
      );

      for (const permissao of itemCatalogo.permissoes ?? []) {
        expect(
          permissoes.has(permissao),
          `${itemCatalogo.href} não contém ${permissao}`,
        ).toBe(true);
      }
    }
  });
});
