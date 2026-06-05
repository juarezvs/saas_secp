"use client";

import { useId } from "react";

export type FiltroSelectOption = {
  value: string;
  label: string;
};

type FiltroSelectImediatoProps = {
  nome: string;
  label: string;
  value: string;
  options: FiltroSelectOption[];
  onChange: (nome: string, valor: string) => void;
  className?: string;
};

export function FiltroSelectImediato({
  nome,
  label,
  value,
  options,
  onChange,
  className,
}: FiltroSelectImediatoProps) {
  const id = useId();

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase text-[var(--muted-foreground)]"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(nome, event.target.value)}
        className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {options.map((option) => (
          <option key={`${nome}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

