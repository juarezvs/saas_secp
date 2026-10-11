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
};

export function DataTablePagination({
  pagina,
  totalPaginas,
  montarHrefPagina,
}: DataTablePaginationProps) {
  const paginaAnterior = Math.max(pagina - 1, 1);
  const proximaPagina = Math.min(pagina + 1, totalPaginas);
  const paginas = montarPaginasVisiveis(pagina, totalPaginas);

  return (
    <Pagination
      aria-label={`Paginação da tabela. Página ${pagina} de ${totalPaginas}`}
    >
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href={montarHrefPagina(1)}
            disabled={pagina <= 1}
            size="icon"
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
          />
        </PaginationItem>

        <PaginationItem>
          <PaginationLink
            href={montarHrefPagina(totalPaginas)}
            disabled={pagina >= totalPaginas}
            size="icon"
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
