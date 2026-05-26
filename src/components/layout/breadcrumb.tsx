import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Trilha de navegação" className="flex items-center text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-[var(--muted-foreground)]">
        <li>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[var(--muted)]"
          >
            <Home className="size-4" aria-hidden="true" />
            <span>Início</span>
          </Link>
        </li>

        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight className="size-4" aria-hidden="true" />

            {item.href ? (
              <Link
                href={item.href}
                className="rounded-md px-2 py-1 hover:bg-[var(--muted)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="rounded-md px-2 py-1 font-medium text-[var(--foreground)]"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
