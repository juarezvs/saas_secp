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
          <p className="text-sm font-semibold uppercase tracking-wide text-secp-blue-900 dark:text-blue-200">
            {eyebrow}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="secp-theme-icon rounded-lg p-2">
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
