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
    <div className="-mb-2 flex min-h-7 items-center gap-3">
      <nav aria-label="Trilha de navegação" className="min-w-0 text-xs">
        <ol className="flex flex-wrap items-center gap-0.5 text-muted-foreground">
          <li>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium text-[var(--secp-theme-accent)] hover:bg-[var(--secp-theme-accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Home className="size-3" aria-hidden="true" />
              <span>Início</span>
            </Link>
          </li>

          {items.map((item) => (
            <li key={item.label} className="flex min-w-0 items-center gap-0.5">
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden="true"
              />

              {item.href ? (
                <Link
                  href={item.href}
                  className="rounded px-1 py-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate rounded px-1 py-0.5 font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
