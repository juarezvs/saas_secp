"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={alternarFavorito}
      disabled={pending}
      aria-pressed={ativo}
      aria-label={ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={ativo ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={[
        "size-9 shrink-0 px-0",
        ativo
          ? "border-[#b78b20]/50 bg-[#b78b20]/10 text-[#8a6616] hover:bg-[#b78b20]/15"
          : "text-[var(--muted-foreground)] hover:text-[#8a6616]",
      ].join(" ")}
    >
      <Star
        className={["size-4", ativo ? "fill-current" : ""].join(" ")}
        aria-hidden="true"
      />
    </Button>
  );
}
