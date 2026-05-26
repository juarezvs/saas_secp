import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: LucideIcon;
};

export function DashboardCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: DashboardCardProps) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {titulo}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-(--muted-foreground)">
        {descricao}
      </p>
    </article>
  );
}
