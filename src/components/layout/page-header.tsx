import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { FavoritoPaginaButton } from "@/modules/favoritos/presentation/favorito-pagina-button";
import { PageHeaderMenuIcon } from "./page-header-menu-icon";
import { PageHeaderTitle } from "./page-title-personalizado";

type PageHeaderProps = {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;

  artigo?: string;
  regraTitulo?: string;
  regraDescricao?: string;

  actions?: ReactNode;
  variant?: "default" | "blade";
};

export function PageHeader({
  icon: Icon,
  titulo,
  descricao,
  actions,
  variant = "default",
}: PageHeaderProps) {
  if (variant === "blade") {
    return (
      <section data-secp-page-header>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="secp-theme-icon relative flex size-9 shrink-0 items-center justify-center rounded-sm">
              <Icon className="size-5" aria-hidden="true" />
              <PageHeaderMenuIcon />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal text-foreground">
                <PageHeaderTitle titulo={titulo} />
              </h1>
              {descricao && (
                <p className="mt-0.5 max-w-5xl text-xs leading-5 text-[var(--muted-foreground)]">
                  {descricao}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {actions}
            <FavoritoPaginaButton />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded border border-zinc-200 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 sm:px-4"
      data-secp-page-header
    >
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 grid-cols-[2.75rem_1px_minmax(0,1fr)] items-center gap-x-3">
          <div className="secp-theme-icon relative flex size-11 shrink-0 items-center justify-center rounded shadow-sm">
            <Icon className="size-5" aria-hidden="true" />
            <PageHeaderMenuIcon />
          </div>

          <span className="h-10 w-px bg-border" aria-hidden="true" />

          <div className="min-w-0">
            <h1 className="min-w-0 text-xl font-bold tracking-normal text-foreground md:text-2xl">
              <PageHeaderTitle titulo={titulo} />
            </h1>

            {descricao && (
              <p className="mt-1 max-w-5xl text-xs leading-5 text-[var(--muted-foreground)]">
                {descricao}
              </p>
            )}
          </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {actions}
          <FavoritoPaginaButton />
        </div>
      </div>
    </section>
  );
}
