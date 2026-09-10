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
};

export function PageHeader({
  icon: Icon,
  titulo,
  descricao,
  actions,
}: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#004b93]/8 via-card to-card shadow-sm">
      <span
        className="absolute inset-x-0 top-0 h-1 bg-[#004b93]"
        aria-hidden="true"
      />
      <div className="flex flex-col justify-between gap-3 px-4 pb-4 pt-5 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3">
          <div className="secp-theme-icon relative flex size-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-[var(--border)]/70 shadow-sm">
            <Icon className="size-5" aria-hidden="true" />
            <PageHeaderMenuIcon />
          </div>

          <h1 className="min-w-0 text-xl font-black tracking-normal text-foreground md:text-2xl">
            <PageHeaderTitle titulo={titulo} />
          </h1>

          {descricao && (
            <p className="col-start-2 mt-1 max-w-5xl text-sm leading-5 text-[var(--muted-foreground)]">
              {descricao}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
        <FavoritoPaginaButton />
        {actions}
      </div>
      </div>
    </section>
  );
}
