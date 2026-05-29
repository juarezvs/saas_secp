"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ServidoresItensPorPagina({
  itensPorPagina,
}: {
  itensPorPagina: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function alterar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("itensPorPagina", valor);
    params.set("pagina", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted-foreground)]">
        Itens por página
      </span>

      <select
        value={String(itensPorPagina)}
        onChange={(event) => alterar(event.target.value)}
        className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
      >
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>
  );
}