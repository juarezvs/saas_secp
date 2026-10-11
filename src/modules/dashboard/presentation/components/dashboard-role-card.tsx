import type { LucideIcon } from "lucide-react";

export type DashboardRoleCardColor =
  | "azul"
  | "azul-claro"
  | "verde"
  | "verde-escuro"
  | "dourado"
  | "cinza";

type DashboardRoleCardProps = {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: LucideIcon;
  cor?: DashboardRoleCardColor;
};

export function DashboardRoleCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: DashboardRoleCardProps) {
  return (
    <article className="flex min-h-24 min-w-0 items-center gap-4 rounded border border-zinc-200 bg-white p-4 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
      <span className="secp-theme-icon inline-flex size-11 shrink-0 items-center justify-center rounded-sm">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <h2 className="truncate text-sm font-semibold">{titulo}</h2>
          <strong className="shrink-0 text-xl font-bold text-[var(--secp-theme-accent)]">
            {valor}
          </strong>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {descricao}
        </p>
      </div>
    </article>
  );
}
