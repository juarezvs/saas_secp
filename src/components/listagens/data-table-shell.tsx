import type { ReactNode } from "react";
import { DataTablePageSize } from "@/components/listagens/data-table-page-size";
import { DataTablePagination } from "@/components/listagens/data-table-pagination";
import { DataTableSelectionProvider } from "@/components/listagens/data-table-selection";

type DataTableShellProps = { title: string; description?: string; total: number; pagina: number; totalPaginas: number; itensPorPagina: number; toolbar: ReactNode; children: ReactNode; montarHrefPagina: (pagina: number) => string };

export function DataTableShell({ title, description, total, pagina, totalPaginas, itensPorPagina, toolbar, children, montarHrefPagina }: DataTableShellProps) {
  return <DataTableSelectionProvider>
    <section className="overflow-hidden border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">
      <div className="border-b border-[var(--border)] px-3 pt-1">
        <div className="inline-flex h-10 items-center gap-2 border-b-2 border-[var(--secp-theme-accent)] px-2">
          <h2 className="text-sm font-semibold">{title}</h2><span className="text-xs text-[var(--muted-foreground)]">{total}</span>
          {description ? <span className="sr-only">{description}</span> : null}
        </div>
      </div>
      <div className="flex min-h-10 flex-wrap items-center border-b border-[var(--border)]">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <div className="ml-auto flex items-center gap-1 px-2 py-1">
          <DataTablePageSize value={itensPorPagina} command />
          <DataTablePagination pagina={pagina} totalPaginas={totalPaginas} montarHrefPagina={montarHrefPagina} command />
        </div>
      </div>
      {children}
    </section>
  </DataTableSelectionProvider>;
}
