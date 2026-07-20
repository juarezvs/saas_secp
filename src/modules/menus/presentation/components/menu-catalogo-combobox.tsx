"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MenuCatalogoItem } from "../../domain/menu-catalogo";

type MenuCatalogoComboboxProps = {
  itens: MenuCatalogoItem[];
  name: string;
};

export function MenuCatalogoCombobox({
  itens,
  name,
}: MenuCatalogoComboboxProps) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(itens[0]?.id ?? "");
  const itemSelecionado = itens.find((item) => item.id === selecionado);
  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return itens.slice(0, 12);
    }

    return itens
      .filter((item) =>
        `${item.label} ${item.href}`.toLowerCase().includes(termo),
      )
      .slice(0, 12);
  }, [busca, itens]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selecionado} />
      <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Pesquisar opcao de menu</span>
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder={itemSelecionado?.label ?? "Pesquisar opcao"}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      <div className="max-h-44 overflow-y-auto rounded-md border bg-background p-1">
        {itensFiltrados.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelecionado(item.id);
              setBusca("");
            }}
            className={[
              "flex w-full flex-col rounded px-2 py-1.5 text-left text-xs transition",
              item.id === selecionado
                ? "bg-secp-blue-900 text-white"
                : "hover:bg-muted",
            ].join(" ")}
          >
            <span className="font-semibold">{item.label}</span>
            <span className="opacity-75">{item.href}</span>
          </button>
        ))}
        {itensFiltrados.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            Nenhuma opcao encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
