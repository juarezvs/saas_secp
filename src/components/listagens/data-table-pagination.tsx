import Link from "next/link";

type DataTablePaginationProps = {
  pagina: number;
  totalPaginas: number;
  montarHrefPagina: (pagina: number) => string;
};

export function DataTablePagination({
  pagina,
  totalPaginas,
  montarHrefPagina,
}: DataTablePaginationProps) {
  const paginaAnterior = Math.max(pagina - 1, 1);
  const proximaPagina = Math.min(pagina + 1, totalPaginas);

  const classesBase =
    "rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <nav
      className="flex gap-2"
      aria-label={`Paginacao da tabela. Pagina ${pagina} de ${totalPaginas}`}
    >
      <Link
        href={montarHrefPagina(paginaAnterior)}
        aria-disabled={pagina <= 1}
        className={`${classesBase} ${
          pagina <= 1
            ? "pointer-events-none opacity-50"
            : "hover:bg-[var(--muted)]"
        }`}
      >
        Anterior
      </Link>

      <Link
        href={montarHrefPagina(proximaPagina)}
        aria-disabled={pagina >= totalPaginas}
        className={`${classesBase} ${
          pagina >= totalPaginas
            ? "pointer-events-none opacity-50"
            : "hover:bg-[var(--muted)]"
        }`}
      >
        Próxima
      </Link>
    </nav>
  );
}

