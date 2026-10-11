import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export type DashboardFeatureCardColor =
  | "azul"
  | "azul-claro"
  | "verde"
  | "verde-escuro"
  | "dourado"
  | "cinza";

type DashboardFeatureCardProps = {
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  cor?: DashboardFeatureCardColor;
};

export function DashboardFeatureCard({
  titulo,
  descricao,
  href,
  icon: Icon,
}: DashboardFeatureCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 min-w-0 items-center gap-4 rounded border border-zinc-200 bg-white p-4 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] transition hover:border-[var(--secp-theme-accent)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <span className="secp-theme-icon inline-flex size-11 shrink-0 items-center justify-center rounded-sm transition group-hover:bg-[var(--secp-theme-accent)] group-hover:text-[var(--secp-theme-accent-contrast)]">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{titulo}</span>
        <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {descricao}
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--secp-theme-accent)]"
        aria-hidden="true"
      />
    </Link>
  );
}
