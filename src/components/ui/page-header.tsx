import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "./utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, icon: Icon, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col justify-between gap-3 border-b border-[var(--border)]/70 pb-3 pt-1 lg:flex-row lg:items-center", className)}>
      <div className="min-w-0">
        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-2.5">
          {Icon && (
            <span className="secp-theme-icon flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-[var(--border)]/70">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-xs font-semibold uppercase text-[var(--secp-theme-accent)]">{eyebrow}</p>}
            <h1 className="text-lg font-semibold tracking-normal text-foreground md:text-xl">{title}</h1>
          </div>
          {description && <p className="col-start-2 mt-0.5 max-w-5xl text-sm leading-5 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

