import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";

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
  artigo,
  regraTitulo,
  regraDescricao,
  actions,
}: PageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
              <Icon className="size-6" aria-hidden="true" />
            </div>

            <h1 className="min-w-0 text-3xl font-bold tracking-tight">
              {titulo}
            </h1>
          </div>

          {artigo && regraTitulo && regraDescricao && (
            <RegraPortariaCard
              artigo={artigo}
              titulo={regraTitulo}
              descricao={regraDescricao}
            />
          )}
        </div>

        {descricao && (
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            {descricao}
          </p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
