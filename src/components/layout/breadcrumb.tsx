import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { VlibrasBreadcrumbButton } from "@/components/accessibility/vlibras-breadcrumb-button";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <nav aria-label="Trilha de navegação" className="min-w-0 text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                  className="rounded-md px-2 py-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="rounded-md px-2 py-1 font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="shrink-0">
        <VlibrasBreadcrumbButton />
      </div>
    </div>
  );
}
