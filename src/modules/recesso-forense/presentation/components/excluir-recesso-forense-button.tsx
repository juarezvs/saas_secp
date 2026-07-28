"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";

type ExcluirRecessoForenseButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  recessoId: string;
  ano: number;
  compacto?: boolean;
};

export function ExcluirRecessoForenseButton({
  action,
  recessoId,
  ano,
  compacto = false,
}: ExcluirRecessoForenseButtonProps) {
  function confirmarExclusao(event: FormEvent<HTMLFormElement>) {
    const confirmado = window.confirm(
      `Confirma a exclusão do recesso forense ${ano}? Esta ação remove também convocações, espelhos e homologações vinculados.`,
    );

    if (!confirmado) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmarExclusao}>
      <input type="hidden" name="recessoId" value={recessoId} />
      <button
        type="submit"
        className={`inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950 ${
          compacto ? "w-full" : ""
        }`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Excluir
      </button>
    </form>
  );
}
