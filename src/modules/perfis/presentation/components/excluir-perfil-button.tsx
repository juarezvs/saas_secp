"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";

export function ExcluirPerfilButton({
  action,
  nome,
}: {
  action: () => void | Promise<void>;
  nome: string;
}) {
  function confirmarExclusao(event: FormEvent<HTMLFormElement>) {
    const confirmado = window.confirm(
      `Excluir o perfil "${nome}"? Esta acao nao pode ser desfeita.`,
    );

    if (!confirmado) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmarExclusao}>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Excluir perfil
      </button>
    </form>
  );
}
