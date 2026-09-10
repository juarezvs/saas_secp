import { MENU_CATALOGO, type MenuCatalogoItem } from "@/modules/menus/domain/menu-catalogo";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type FavoritoUsuarioPerfilDto = {
  id: string;
  itemCatalogo: string;
  titulo: string;
  descricao: string;
  href: string;
  ordem: number;
};

type PerfilFavoritos = {
  id?: string | null;
  permissoes?: string[] | null;
};

function normalizarPathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/dashboard";
}

function normalizarHref(href: string) {
  const [pathname, search = ""] = href.split("?");

  return {
    pathname: normalizarPathname(pathname),
    search,
  };
}

function rotaCorresponde(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const rota = normalizarHref(href);
  const pathnameAtual = normalizarPathname(pathname);

  if (rota.search) {
    if (pathnameAtual !== rota.pathname) {
      return false;
    }

    const paramsRota = new URLSearchParams(rota.search);

    return Array.from(paramsRota.entries()).every(
      ([chave, valor]) => searchParams.get(chave) === valor,
    );
  }

  return (
    pathnameAtual === rota.pathname ||
    pathnameAtual.startsWith(`${rota.pathname}/`)
  );
}

export function buscarItemCatalogoPorRota(
  pathname: string,
  searchParams?: URLSearchParams | string | null,
) {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams ?? new URLSearchParams();

  return [...MENU_CATALOGO]
    .filter((item) => rotaCorresponde(pathname, params, item.href))
    .sort((a, b) => {
      const tamanhoA = a.href.length;
      const tamanhoB = b.href.length;

      if (tamanhoA !== tamanhoB) {
        return tamanhoB - tamanhoA;
      }

      return a.label.localeCompare(b.label);
    })[0];
}

export function perfilPodeFavoritarItem(
  item: MenuCatalogoItem,
  perfil: PerfilFavoritos,
) {
  if (!item.permissoes?.length) {
    return true;
  }

  return possuiAlgumaPermissaoNaLista(
    perfil.permissoes ?? [],
    item.permissoes,
  );
}

function descricaoFavorito(item: MenuCatalogoItem) {
  if (item.id === "/dashboard") {
    return "Acesse o painel inicial do perfil ativo.";
  }

  return "Atalho salvo para acesso rapido nesta funcionalidade.";
}

function toDto(favorito: {
  id: string;
  itemCatalogo: string;
  titulo: string | null;
  descricao: string | null;
  ordem: number;
}): FavoritoUsuarioPerfilDto | null {
  const item = MENU_CATALOGO.find(
    (catalogoItem) => catalogoItem.id === favorito.itemCatalogo,
  );

  if (!item) {
    return null;
  }

  return {
    id: favorito.id,
    itemCatalogo: favorito.itemCatalogo,
    titulo: favorito.titulo ?? item.label,
    descricao: favorito.descricao ?? descricaoFavorito(item),
    href: item.href,
    ordem: favorito.ordem,
  };
}

export async function listarFavoritosUsuarioPerfil(params: {
  usuarioId: string;
  perfil: PerfilFavoritos;
}) {
  if (!params.perfil.id) {
    return [];
  }

  const favoritos = await prisma.usuarioPerfilFavorito.findMany({
    where: {
      usuarioId: params.usuarioId,
      perfilId: params.perfil.id,
    },
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });

  return favoritos
    .map(toDto)
    .filter((favorito): favorito is FavoritoUsuarioPerfilDto => {
      if (!favorito) {
        return false;
      }

      const item = MENU_CATALOGO.find(
        (catalogoItem) => catalogoItem.id === favorito.itemCatalogo,
      );

      return item ? perfilPodeFavoritarItem(item, params.perfil) : false;
    });
}

export async function adicionarFavoritoUsuarioPerfil(params: {
  usuarioId: string;
  perfil: PerfilFavoritos;
  itemCatalogo: string;
}) {
  if (!params.perfil.id) {
    throw new Error("Perfil ativo invalido.");
  }

  const item = MENU_CATALOGO.find(
    (catalogoItem) => catalogoItem.id === params.itemCatalogo,
  );

  if (!item) {
    throw new Error("Item de menu nao encontrado.");
  }

  if (!perfilPodeFavoritarItem(item, params.perfil)) {
    throw new Error("Perfil sem permissao para favoritar este item.");
  }

  const totalFavoritos = await prisma.usuarioPerfilFavorito.count({
    where: {
      usuarioId: params.usuarioId,
      perfilId: params.perfil.id,
    },
  });

  const favorito = await prisma.usuarioPerfilFavorito.upsert({
    where: {
      usuarioId_perfilId_itemCatalogo: {
        usuarioId: params.usuarioId,
        perfilId: params.perfil.id,
        itemCatalogo: item.id,
      },
    },
    create: {
      usuarioId: params.usuarioId,
      perfilId: params.perfil.id,
      itemCatalogo: item.id,
      titulo: item.label,
      descricao: descricaoFavorito(item),
      ordem: totalFavoritos,
    },
    update: {
      titulo: item.label,
      descricao: descricaoFavorito(item),
    },
  });

  const dto = toDto(favorito);

  if (!dto) {
    throw new Error("Favorito invalido.");
  }

  return dto;
}

export async function removerFavoritoUsuarioPerfil(params: {
  usuarioId: string;
  perfilId?: string | null;
  itemCatalogo: string;
}) {
  if (!params.perfilId) {
    return;
  }

  await prisma.usuarioPerfilFavorito.deleteMany({
    where: {
      usuarioId: params.usuarioId,
      perfilId: params.perfilId,
      itemCatalogo: params.itemCatalogo,
    },
  });
}
