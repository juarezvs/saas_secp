import Link from "next/link";

type DashboardAtalhoProps = {
  href: string;
  titulo: string;
  descricao?: string;
};

export function DashboardAtalho({
  href,
  titulo,
  descricao,
}: DashboardAtalhoProps) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="text-sm font-semibold">{titulo}</span>
      {descricao && (
        <span className="mt-2 block text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </span>
      )}
    </Link>
  );
}
