"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";

type FiltroTextoDebounceProps = {
  nome: string;
  label: string;
  valor: string;
  onChange: (nome: string, valor: string) => void;
  className?: string;
  placeholder?: string;
  comIconeBusca?: boolean;
  delayMs?: number;
};

export function FiltroTextoDebounce({
  nome,
  label,
  valor,
  onChange,
  className,
  placeholder,
  comIconeBusca = false,
  delayMs = 3000,
}: FiltroTextoDebounceProps) {
  const id = useId();
  const [valorLocal, setValorLocal] = useState(valor);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (valorLocal !== valor) {
        onChange(nome, valorLocal);
      }
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, nome, onChange, valor, valorLocal]);

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase text-[var(--muted-foreground)]"
      >
        {label}
      </label>

      {comIconeBusca ? (
        <div className="mt-2 flex h-10 items-center gap-2 rounded-md border px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
          <Search
            className="size-4 shrink-0 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <input
            id={id}
            value={valorLocal}
            onChange={(event) => setValorLocal(event.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      ) : (
        <input
          id={id}
          value={valorLocal}
          onChange={(event) => setValorLocal(event.target.value)}
          placeholder={placeholder}
          className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      )}
    </div>
  );
}
