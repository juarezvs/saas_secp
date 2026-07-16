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
  asyncSearchUrl?: string;
  minSearchLength?: number;
  onValueChange?: (value: string) => void;
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
  asyncSearchUrl,
  minSearchLength = 2,
  onValueChange,
}: SearchableSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(defaultValue);
  const [busca, setBusca] = useState("");
  const [opcoesRemotas, setOpcoesRemotas] = useState<
    SearchableSelectOption[]
  >([]);
  const [carregando, setCarregando] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const opcoes = useMemo(() => {
    const mapa = new Map<string, SearchableSelectOption>();

    for (const option of [...options, ...opcoesRemotas]) {
      mapa.set(option.value, option);
    }

    return Array.from(mapa.values());
  }, [opcoesRemotas, options]);
  const selecionada = opcoes.find((option) => option.value === valor);

  const filtradas = useMemo(() => {
    const termo = normalizarBusca(busca.trim());

    if (asyncSearchUrl) {
      if (termo.length >= minSearchLength) {
        return opcoesRemotas;
      }

      return options;
    }

    if (!termo) {
      return opcoes;
    }

    return opcoes.filter((option) =>
      normalizarBusca(`${option.label} ${option.searchText ?? ""}`).includes(
        termo,
      ),
    );
  }, [
    asyncSearchUrl,
    busca,
    minSearchLength,
    opcoes,
    opcoesRemotas,
    options,
  ]);

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

  useEffect(() => {
    if (!asyncSearchUrl || !aberto || disabled) {
      return;
    }

    const termo = busca.trim();

    if (termo.length < minSearchLength) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setCarregando(true);
        const separador = asyncSearchUrl.includes("?") ? "&" : "?";
        const resposta = await fetch(
          `${asyncSearchUrl}${separador}q=${encodeURIComponent(termo)}`,
          { signal: controller.signal },
        );

        if (!resposta.ok) {
          setOpcoesRemotas([]);
          return;
        }

        const payload = (await resposta.json()) as {
          options?: SearchableSelectOption[];
        };
        setOpcoesRemotas(Array.isArray(payload.options) ? payload.options : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setOpcoesRemotas([]);
        }
      } finally {
        setCarregando(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [aberto, asyncSearchUrl, busca, disabled, minSearchLength]);

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
            {carregando && (
              <p className="px-3 py-3 text-center text-sm text-[var(--muted-foreground)]">
                Pesquisando...
              </p>
            )}

            {!carregando &&
              filtradas.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === valor}
                onClick={() => {
                  setValor(option.value);
                  onValueChange?.(option.value);
                  setBusca("");
                  setAberto(false);
                }}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                {option.label}
              </button>
              ))}

            {!carregando && filtradas.length === 0 && (
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
