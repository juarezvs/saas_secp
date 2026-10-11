import type { ReactNode } from "react";
import { DataTablePageSize } from "@/components/listagens/data-table-page-size";
import { DataTablePagination } from "@/components/listagens/data-table-pagination";

type DataTableShellProps = {
  title: string;
  description?: string;
  total: number;
  pagina: number;
  totalPaginas: number;
  itensPorPagina: number;
  toolbar: ReactNode;
  children: ReactNode;
  montarHrefPagina: (pagina: number) => string;
};

export function DataTableShell({
  title,
  description,
  total,
  pagina,
  totalPaginas,
  itensPorPagina,
  toolbar,
  children,
  montarHrefPagina,
}: DataTableShellProps) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="space-y-4 border-b p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {toolbar}
      </div>

      <div className="flex flex-col justify-between gap-3 border-b px-5 py-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            {total} registro(s) encontrado(s)
          </p>
          <DataTablePageSize value={itensPorPagina} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[var(--muted-foreground)]">
            Página {pagina} de {totalPaginas}
          </span>
          <DataTablePagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            montarHrefPagina={montarHrefPagina}
          />
        </div>
      </div>

      {children}
    </section>
  );
}
