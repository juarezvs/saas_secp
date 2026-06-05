"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  criarQueryStringAtualizada,
  montarHrefComQuery,
} from "@/components/listagens/query-string";

type DataTablePageSizeProps = {
  value: number;
  options?: number[];
};

export function DataTablePageSize({
  value,
  options = [10, 20, 50, 100],
}: DataTablePageSizeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function alterar(valor: string) {
    const params = criarQueryStringAtualizada(searchParams, {
      itensPorPagina: valor,
      pagina: "1",
    });

    router.push(montarHrefComQuery(pathname, params));
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted-foreground)]">
        Itens por pagina
      </span>

      <select
        value={String(value)}
        onChange={(event) => alterar(event.target.value)}
        className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

