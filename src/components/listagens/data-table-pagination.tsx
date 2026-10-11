import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

type DataTablePaginationProps = {
  pagina: number;
  totalPaginas: number;
  montarHrefPagina: (pagina: number) => string;
  command?: boolean;
};

export function DataTablePagination({
  pagina,
  totalPaginas,
  montarHrefPagina,
  command = false,
}: DataTablePaginationProps) {
  const paginaAnterior = Math.max(pagina - 1, 1);
  const proximaPagina = Math.min(pagina + 1, totalPaginas);
  const paginas = montarPaginasVisiveis(pagina, totalPaginas);

  return (
    <Pagination
      aria-label={`Paginação da tabela. Página ${pagina} de ${totalPaginas}`}
    >
      <PaginationContent className={command ? "gap-0.5" : undefined}>
        <PaginationItem>
          <PaginationLink
            href={montarHrefPagina(1)}
            disabled={pagina <= 1}
            size="icon"
            className={command ? commandButtonClassName : undefined}
            aria-label="Ir para a primeira página"
            title="Primeira página"
          >
            <ChevronsLeft className="size-4" aria-hidden="true" />
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <PaginationPrevious
            href={montarHrefPagina(paginaAnterior)}
            disabled={pagina <= 1}
            className={command ? commandButtonClassName : undefined}
          />
        </PaginationItem>

        {paginas.map((item, index) => (
          <PaginationItem key={`${item}-${index}`}>
            {item === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={montarHrefPagina(item)}
                isActive={item === pagina}
                className={command ? commandButtonClassName : undefined}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={montarHrefPagina(proximaPagina)}
            disabled={pagina >= totalPaginas}
            className={command ? commandButtonClassName : undefined}
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationLink
            href={montarHrefPagina(totalPaginas)}
            disabled={pagina >= totalPaginas}
            size="icon"
            className={command ? commandButtonClassName : undefined}
            aria-label="Ir para a última página"
            title="Última página"
          >
            <ChevronsRight className="size-4" aria-hidden="true" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

const commandButtonClassName =
  "h-8 min-w-8 w-auto rounded-sm border border-transparent px-2 text-xs shadow-none hover:bg-[var(--muted)] data-[active]:border-[var(--border)] data-[active]:bg-[var(--muted)]";

function montarPaginasVisiveis(
  paginaAtual: number,
  totalPaginas: number,
): Array<number | "ellipsis"> {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, index) => index + 1);
  }

  const paginas = new Set<number>([
    1,
    totalPaginas,
    paginaAtual,
    Math.max(1, paginaAtual - 1),
    Math.min(totalPaginas, paginaAtual + 1),
  ]);

  const ordenadas = Array.from(paginas).sort((a, b) => a - b);
  const resultado: Array<number | "ellipsis"> = [];

  ordenadas.forEach((numeroPagina, index) => {
    const anterior = ordenadas[index - 1];
    if (anterior && numeroPagina - anterior > 1) {
      resultado.push("ellipsis");
    }
    resultado.push(numeroPagina);
  });

  return resultado;
}
