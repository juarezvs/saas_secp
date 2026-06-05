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
    <header className={cn("flex flex-col justify-between gap-4 lg:flex-row lg:items-start", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secp-blue-900 text-white shadow-sm">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-xs font-semibold uppercase text-secp-blue-700">{eyebrow}</p>}
            <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">{title}</h1>
          </div>
        </div>
        {description && <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

