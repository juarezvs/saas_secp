"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";
import { useFavoritosPerfil } from "./favoritos-provider";

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

function buscarItemAtual(pathname: string, searchParams: URLSearchParams) {
  return [...MENU_CATALOGO]
    .filter((item) => rotaCorresponde(pathname, searchParams, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function FavoritoPaginaButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isFavorito, favoritar, desfavoritar } = useFavoritosPerfil();
  const [pending, startTransition] = useTransition();
  const item = useMemo(
    () => buscarItemAtual(pathname, searchParams),
    [pathname, searchParams],
  );

  if (!item) {
    return null;
  }

  const ativo = isFavorito(item.id);

  function alternarFavorito() {
    startTransition(() => {
      void (ativo ? desfavoritar(item.id) : favoritar(item.id)).catch(
        () => undefined,
      );
    });
  }

  return (
    <Toggle
      type="button"
      variant="outline"
      size="sm"
      pressed={ativo}
      onPressedChange={alternarFavorito}
      disabled={pending}
      aria-label={ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className="shrink-0"
    >
      <Bookmark
        className={["size-4", ativo ? "fill-current" : ""].join(" ")}
        aria-hidden="true"
      />
      <span>{ativo ? "Desfavoritar" : "Favoritar"}</span>
    </Toggle>
  );
}
