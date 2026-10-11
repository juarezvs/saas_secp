"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type SelectionContextValue = { selecionados: Set<string>; alternar: (id: string) => void; selecionar: (ids: string[], marcado: boolean) => void };
const SelectionContext = createContext<SelectionContextValue | null>(null);

export function DataTableSelectionProvider({ children }: { children: ReactNode }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const value = useMemo<SelectionContextValue>(() => ({
    selecionados,
    alternar(id) { setSelecionados((atual) => { const proximo = new Set(atual); if (proximo.has(id)) proximo.delete(id); else proximo.add(id); return proximo; }); },
    selecionar(ids, marcado) { setSelecionados((atual) => { const proximo = new Set(atual); for (const id of ids) { if (marcado) proximo.add(id); else proximo.delete(id); } return proximo; }); },
  }), [selecionados]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useDataTableSelection() { const value = useContext(SelectionContext); if (!value) throw new Error("Selecao fora do contexto da tabela"); return value; }
export function DataTableRowCheckbox({ id, label }: { id: string; label: string }) { const { selecionados, alternar } = useDataTableSelection(); return <input type="checkbox" checked={selecionados.has(id)} onChange={() => alternar(id)} className="size-4 rounded border-[var(--border)]" aria-label={label} />; }
export function DataTableHeaderCheckbox({ ids, label = "Selecionar todos os registros desta pagina" }: { ids: string[]; label?: string }) {
  const { selecionados, selecionar } = useDataTableSelection();
  const ref = useRef<HTMLInputElement>(null);
  const quantidade = ids.filter((id) => selecionados.has(id)).length;
  useEffect(() => { if (ref.current) ref.current.indeterminate = quantidade > 0 && quantidade < ids.length; }, [ids.length, quantidade]);
  return <input ref={ref} type="checkbox" checked={ids.length > 0 && quantidade === ids.length} onChange={(event) => selecionar(ids, event.currentTarget.checked)} className="size-4 rounded border-[var(--border)]" aria-label={label} />;
}
