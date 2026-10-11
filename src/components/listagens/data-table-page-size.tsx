"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  criarQueryStringAtualizada,
  montarHrefComQuery,
} from "@/components/listagens/query-string";

type DataTablePageSizeProps = {
  value: number;
  options?: number[];
  compact?: boolean;
  command?: boolean;
};

export function DataTablePageSize({
  value,
  options = [10, 20, 50, 100],
  compact = false,
  command = false,
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
    <label
      className={
        command
          ? "flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)]"
          : "flex items-center gap-2"
      }
    >
      <span className={compact || command ? "text-xs" : "text-sm text-[var(--muted-foreground)]"}>
        Itens por página
      </span>

      <select
        value={String(value)}
        onChange={(event) => alterar(event.target.value)}
        className={
          command
            ? "h-7 min-w-12 rounded-sm border border-[var(--border)] bg-[var(--card)] px-1.5 text-xs outline-none focus:border-[var(--secp-theme-accent)]"
            : compact
              ? "h-8 rounded-sm border bg-[var(--card)] px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              : "h-9 rounded-md border bg-[var(--card)] px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        }
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

