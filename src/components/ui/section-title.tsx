import type { ReactNode } from "react";

import { cn } from "./utils";

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, description, action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex flex-col justify-between gap-3 sm:flex-row sm:items-end", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

