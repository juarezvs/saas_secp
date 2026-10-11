"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SelectionContextValue = {
  selecionados: Set<string>;
  alternar: (id: string) => void;
  selecionar: (ids: string[], marcado: boolean) => void;
  limpar: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function ServidoresSelectionProvider({ children }: { children: ReactNode }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const value = useMemo<SelectionContextValue>(() => ({
    selecionados,
    alternar: (id) => setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
      return proximo;
    }),
    selecionar: (ids, marcado) => setSelecionados((atual) => {
      const proximo = new Set(atual);
      for (const id of ids) {
        if (marcado) proximo.add(id);
        else proximo.delete(id);
      }
      return proximo;
    }),
    limpar: () => setSelecionados(new Set()),
  }), [selecionados]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useServidoresSelection() {
  const contexto = useContext(SelectionContext);
  if (!contexto) throw new Error("useServidoresSelection requer ServidoresSelectionProvider");
  return contexto;
}
