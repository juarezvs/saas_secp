"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  Star,
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

  return Star;
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
            className="group flex min-h-[96px] flex-col justify-between rounded-xl border border-amber-100 bg-amber-50/45 p-3 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="grid size-10 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight
                className="size-4 text-blue-700 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-black leading-tight text-blue-950">
                {favorito.titulo}
                <Star
                  className="size-3.5 fill-amber-400 text-amber-500"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-slate-500">
                {favorito.descricao}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
