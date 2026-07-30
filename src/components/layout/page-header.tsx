import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

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
    <section className="flex flex-col justify-between gap-3 border-b border-[var(--border)]/70 pb-3 pt-1 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-2.5">
          <div className="secp-theme-icon relative flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-[var(--border)]/70">
            <Icon className="size-5" aria-hidden="true" />
            <PageHeaderMenuIcon />
          </div>

          <h1 className="min-w-0 text-lg font-semibold tracking-normal text-foreground md:text-xl">
            <PageHeaderTitle titulo={titulo} />
          </h1>

          {descricao && (
            <p className="col-start-2 mt-0.5 max-w-5xl text-sm leading-5 text-[var(--muted-foreground)]">
              {descricao}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
