import type { LucideIcon } from "lucide-react";

export function DashboardCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            {titulo}
          </p>

          <p className="mt-2 text-3xl font-bold">{valor}</p>

          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {descricao}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}