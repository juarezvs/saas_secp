"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Clock,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { useFavoritosPerfil } from "@/modules/favoritos/presentation/favoritos-provider";

function iconeFavorito(href: string): LucideIcon {
  if (href.includes("espelho-ponto")) {
    return CalendarDays;
  }

  if (href.includes("marcacoes")) {
    return Clock;
  }

  if (href.includes("relatorio") || href.includes("solicitacoes")) {
    return FileText;
  }

  return Bookmark;
}

export function AcessoRapidoFavoritos() {
  const { favoritos } = useFavoritosPerfil();

  if (favoritos.length === 0) {
    return null;
  }

  return (
    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {favoritos.slice(0, 6).map((favorito) => {
        const Icon = iconeFavorito(favorito.href);

        return (
          <Link
            key={favorito.id}
            href={favorito.href}
            className="group flex min-h-[88px] items-start gap-3 rounded border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-zinc-700 dark:bg-zinc-950"
          >
            <span className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center bg-[#ffb900] text-white">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-black leading-tight text-blue-950">
                {favorito.titulo}
                <Bookmark
                  className="size-3.5 fill-amber-400 text-amber-500"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-slate-500">
                {favorito.descricao}
              </span>
            </span>
            <ArrowRight className="mt-2 size-4 shrink-0 text-blue-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
