"use client";

import { useEffect, useMemo, useRef, useState, type SelectHTMLAttributes } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./utils";

export type SearchableSelectOption = { value: string; label: string; searchText?: string; disabled?: boolean; group?: string };
type Props = {
  id: string; name: string; options: SearchableSelectOption[];
  value?: string; defaultValue?: string; placeholder?: string; searchPlaceholder?: string; emptyMessage?: string;
  disabled?: boolean; required?: boolean; className?: string; triggerClassName?: string;
  asyncSearchUrl?: string; minSearchLength?: number; onValueChange?: (value: string) => void;
  nativeSelectProps?: SelectHTMLAttributes<HTMLSelectElement>;
};
function normalizar(valor: string) { return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function SearchableSelect({
  id, name, options, value, defaultValue = "", placeholder = "Selecione",
  searchPlaceholder = "Pesquisar...", emptyMessage = "Nenhum resultado encontrado.",
  disabled = false, required = false, className, triggerClassName,
  asyncSearchUrl, minSearchLength = 2, onValueChange, nativeSelectProps,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [valorLocal, setValorLocal] = useState(defaultValue);
  const valor = value ?? valorLocal;
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [invalido, setInvalido] = useState(false);
  const [remotas, setRemotas] = useState<SearchableSelectOption[]>([]);
  const [ultimaSelecionada, setUltimaSelecionada] = useState<SearchableSelectOption | null>(null);
  const [carregando, setCarregando] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const opcoes = useMemo(() => Array.from(new Map([...options, ...(ultimaSelecionada ? [ultimaSelecionada] : []), ...remotas].map(o => [o.value, o])).values()), [options, remotas, ultimaSelecionada]);
  const selecionada = opcoes.find(o => o.value === valor);
  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (asyncSearchUrl) return termo.length >= minSearchLength ? remotas : options;
    return termo ? opcoes.filter(o => normalizar(`${o.label} ${o.searchText ?? ""} ${o.group ?? ""}`).includes(termo)) : opcoes;
  }, [asyncSearchUrl, busca, minSearchLength, opcoes, remotas, options]);
  const selecionaveis = filtradas.filter(o => !o.disabled);
  const opcaoAtiva = selecionaveis[Math.min(ativo, selecionaveis.length - 1)];

  useEffect(() => {
    if (aberto && opcaoAtiva) document.getElementById(`${id}-option-${filtradas.indexOf(opcaoAtiva)}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, id, filtradas, opcaoAtiva]);

  useEffect(() => {
    const form = selectRef.current?.form;
    function resetar(event: Event) {
      queueMicrotask(() => {
        if (event.defaultPrevented) return;
        if (value === undefined) setValorLocal(defaultValue);
        if (selectRef.current) selectRef.current.value = value ?? defaultValue;
        setInvalido(false); setBusca(""); setAberto(false);
      });
    }
    form?.addEventListener("reset", resetar);
    return () => form?.removeEventListener("reset", resetar);
  }, [defaultValue, value]);

  useEffect(() => {
    if (!asyncSearchUrl || !aberto || disabled || busca.trim().length < minSearchLength) return;
    const controller = new AbortController();
    const request = ++requestRef.current;
    const timeout = window.setTimeout(async () => {
      setCarregando(true);
      try {
        const sep = asyncSearchUrl.includes("?") ? "&" : "?";
        const response = await fetch(`${asyncSearchUrl}${sep}q=${encodeURIComponent(busca.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Pesquisa indisponivel");
        const payload = await response.json() as { options?: SearchableSelectOption[] };
        if (!controller.signal.aborted && request === requestRef.current) setRemotas(Array.isArray(payload.options) ? payload.options : []);
      } catch {
        if (!controller.signal.aborted && request === requestRef.current) setRemotas([]);
      } finally {
        if (request === requestRef.current) setCarregando(false);
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [aberto, asyncSearchUrl, busca, disabled, minSearchLength]);

  function escolher(option: SearchableSelectOption) {
    const select = selectRef.current;
    if (!select || option.disabled) return;
    setUltimaSelecionada(option);
    // Evento nativo: preserva onChange, FormData e aplicação automática dos filtros.
    if (select.value !== option.value) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setAberto(false); setBusca("");
  }

  return <div className={cn("relative min-w-0", className)}>
    <Popover.Root open={aberto && !disabled} onOpenChange={open => { setAberto(open); setBusca(""); setAtivo(0); setCarregando(false); }}>
      <Popover.Trigger asChild>
        <button ref={triggerRef} id={id} type="button" disabled={disabled}
          role="combobox" aria-expanded={aberto && !disabled} aria-haspopup="listbox"
          aria-controls={aberto ? `${id}-options` : undefined} aria-required={required || undefined} aria-invalid={invalido || undefined}
          aria-label={nativeSelectProps?.["aria-label"]} aria-labelledby={nativeSelectProps?.["aria-labelledby"]}
          aria-describedby={nativeSelectProps?.["aria-describedby"]}
          onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setAberto(true); } }}
          className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 text-left text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-70", triggerClassName, invalido && "border-destructive")}>
          <span className={cn("min-w-0 truncate", !selecionada && "text-muted-foreground")}>{selecionada?.label ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} collisionPadding={8}
          onOpenAutoFocus={event => { event.preventDefault(); searchRef.current?.focus(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            // Não roubar o foco de outra lista/campo aberto logo após a seleção.
            if (document.activeElement === document.body || document.activeElement === searchRef.current) triggerRef.current?.focus();
          }}
          className="z-[80] min-w-48 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] rounded-md border bg-card p-2 text-card-foreground shadow-lg">
          <input ref={searchRef} type="search" value={busca} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
            aria-controls={`${id}-options`}
            aria-activedescendant={opcaoAtiva ? `${id}-option-${filtradas.indexOf(opcaoAtiva)}` : undefined}
            onChange={event => { event.stopPropagation(); setBusca(event.target.value); setAtivo(0); setCarregando(Boolean(asyncSearchUrl && event.target.value.trim().length >= minSearchLength)); }}
            onKeyDown={event => {
              if (["Enter", "ArrowDown", "ArrowUp", "Escape"].includes(event.key)) { event.preventDefault(); event.stopPropagation(); }
              if (event.key === "Escape") setAberto(false);
              if (event.key === "ArrowDown") setAtivo(index => selecionaveis.length ? (index + 1) % selecionaveis.length : 0);
              if (event.key === "ArrowUp") setAtivo(index => selecionaveis.length ? (index - 1 + selecionaveis.length) % selecionaveis.length : 0);
              if (event.key === "Enter" && opcaoAtiva && !carregando) escolher(opcaoAtiva);
            }}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring" />
          <div className="mt-2 max-h-[min(16rem,calc(var(--radix-popover-content-available-height)-4rem))] overflow-y-auto"
            role="listbox" id={`${id}-options`} aria-labelledby={id} aria-busy={carregando}>
            {carregando && <p role="status" className="px-3 py-3 text-center text-sm text-muted-foreground">Pesquisando...</p>}
            {!carregando && filtradas.map((option, index) => <button key={option.value} id={`${id}-option-${index}`}
              type="button" role="option" tabIndex={-1} disabled={option.disabled} aria-selected={option.value === valor}
              onClick={() => escolher(option)}
              className={cn("flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50", opcaoAtiva === option && "bg-muted")}>
              <span>{option.group && <span className="mr-1 text-xs text-muted-foreground">{option.group} ·</span>}{option.label}</span>
              {option.value === valor && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </button>)}
            {!carregando && filtradas.length === 0 && <p role="status" className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    <select {...nativeSelectProps} ref={selectRef} id={`${id}-native`} name={name || undefined} className="sr-only" tabIndex={-1}
      aria-hidden="true" disabled={disabled} required={required} value={valor} defaultValue={undefined}
      onInvalid={event => { nativeSelectProps?.onInvalid?.(event); event.preventDefault(); setInvalido(true); triggerRef.current?.focus(); }}
      onChange={event => {
        if (value === undefined) setValorLocal(event.target.value);
        setInvalido(false); onValueChange?.(event.target.value); nativeSelectProps?.onChange?.(event);
      }}>
      {!opcoes.some(o => o.value === valor) && <option value={valor}>{placeholder}</option>}
      {opcoes.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    {invalido && <p role="alert" className="mt-1 text-xs text-destructive">Selecione uma opção.</p>}
  </div>;
}
