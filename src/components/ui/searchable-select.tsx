"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  id: string;
  name: string;
  options: SearchableSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SearchableSelect({
  id,
  name,
  options,
  defaultValue = "",
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled = false,
  required = false,
  className = "",
}: SearchableSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(defaultValue);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selecionada = options.find((option) => option.value === valor);

  const filtradas = useMemo(() => {
    const termo = normalizarBusca(busca.trim());

    if (!termo) {
      return options;
    }

    return options.filter((option) =>
      normalizarBusca(`${option.label} ${option.searchText ?? ""}`).includes(
        termo,
      ),
    );
  }, [busca, options]);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" id={id} name={name} value={valor} />

      <button
        type="button"
        disabled={disabled}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        data-required={required || undefined}
        onClick={() => setAberto((atual) => !atual)}
        className="flex h-10 w-full items-center justify-between rounded-md border bg-[var(--card)] px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className={selecionada ? "" : "text-[var(--muted-foreground)]"}>
          {selecionada?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </button>

      {aberto && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-[var(--card)] p-2 shadow-lg">
          <input
            autoFocus
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border bg-[var(--background)] px-3 text-sm outline-none focus:border-blue-800"
          />

          <div className="mt-2 max-h-64 overflow-y-auto" role="listbox">
            {filtradas.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === valor}
                onClick={() => {
                  setValor(option.value);
                  setBusca("");
                  setAberto(false);
                }}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                {option.label}
              </button>
            ))}

            {filtradas.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
