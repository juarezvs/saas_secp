"use client";

import { createContext, useContext, useId } from "react";
import { Switch } from "@/components/ui/switch";

export const ExibirOrigemMarcacoesContext = createContext<{
  exibirOrigem: boolean;
  setExibirOrigem: (exibir: boolean) => void;
} | null>(null);

export function ExibirOrigemMarcacoesSwitch() {
  const contexto = useContext(ExibirOrigemMarcacoesContext);
  const id = useId();
  if (!contexto) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 font-normal normal-case tracking-normal print:hidden">
      <Switch
        id={id}
        checked={contexto.exibirOrigem}
        onCheckedChange={contexto.setExibirOrigem}
        className="scale-75 -mx-1"
      />
      <label htmlFor={id} className="cursor-pointer text-[10px]">Exibir origem</label>
    </span>
  );
}
