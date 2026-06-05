import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type DashboardPerfilShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function DashboardPerfilShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: DashboardPerfilShellProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            {eyebrow}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            {title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </section>

      {children}
    </div>
  );
}
