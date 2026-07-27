"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";
import type { MenusPersonalizadosPorPerfil } from "@/modules/menus/domain/menu-personalizado";

type PageTitleContextValue = {
  perfilAtivoId?: string;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
};

const PageTitleContext = createContext<PageTitleContextValue>({});

function normalizarPathname(pathname: string) {
  const valor = pathname.trim();

  if (!valor || valor === "/") {
    return "/dashboard";
  }

  return valor.length > 1 ? valor.replace(/\/+$/, "") : valor;
}

function normalizarHref(href: string) {
  const [pathname, search = ""] = href.split("?");

  return {
    pathname: normalizarPathname(pathname),
    search: search ? `?${search}` : "",
  };
}

function buscarItemCatalogoDaRota(pathname: string, search: string) {
  const pathnameAtual = normalizarPathname(pathname);
  const searchAtual = search.trim();
  const catalogoComRota = MENU_CATALOGO.map((item) => ({
    item,
    rota: normalizarHref(item.href),
  }));

  const itemExato = catalogoComRota.find(
    ({ rota }) => rota.pathname === pathnameAtual && rota.search === searchAtual,
  );

  if (itemExato) {
    return itemExato.item;
  }

  return catalogoComRota.find(
    ({ rota }) => rota.pathname === pathnameAtual && !rota.search,
  )?.item;
}

function buscarTituloPersonalizado(params: {
  perfilAtivoId?: string;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  pathname: string;
  search: string;
}) {
  const itemCatalogo = buscarItemCatalogoDaRota(params.pathname, params.search);
  const menuPerfil = params.perfilAtivoId
    ? params.menusPersonalizados?.[params.perfilAtivoId]
    : undefined;

  if (!itemCatalogo || !menuPerfil) {
    return null;
  }

  const itens = [
    ...menuPerfil.itensRaiz,
    ...menuPerfil.grupos.flatMap((grupo) => grupo.itens),
  ]
    .filter((item) => item.ativo && item.itemCatalogo === itemCatalogo.id)
    .sort((a, b) => a.ordem - b.ordem);
  const titulo = itens.find((item) => item.label?.trim())?.label?.trim();

  return titulo || null;
}

export function PageTitlePersonalizadoProvider({
  perfilAtivoId,
  menusPersonalizados,
  children,
}: PageTitleContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ perfilAtivoId, menusPersonalizados }),
    [perfilAtivoId, menusPersonalizados],
  );

  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function PageHeaderTitle({ titulo }: { titulo: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contexto = useContext(PageTitleContext);
  const tituloExibido = buscarTituloPersonalizado({
    ...contexto,
    pathname,
    search: searchParams.toString() ? `?${searchParams.toString()}` : "",
  });

  return <>{tituloExibido ?? titulo}</>;
}
