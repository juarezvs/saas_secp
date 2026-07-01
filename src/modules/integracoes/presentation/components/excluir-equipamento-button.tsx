"use client";

import { Trash2 } from "lucide-react";

export function ExcluirEquipamentoButton({ nome }: { nome: string }) {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      title="Excluir equipamento"
      onClick={(event) => {
        const confirmado = window.confirm(
          `Excluir o equipamento "${nome}"? Esta acao tambem removera os eventos vinculados ao equipamento.`,
        );

        if (!confirmado) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 className="size-3.5" />
      Excluir
    </button>
  );
}
