"use client";

import type { FormEvent } from "react";

export function DesvincularPerfilUsuarioButton({
  action,
  perfilNome,
}: {
  action: () => void | Promise<void>;
  perfilNome: string;
}) {
  function confirmarDesvinculacao(event: FormEvent<HTMLFormElement>) {
    const confirmado = window.confirm(
      `Desvincular o perfil "${perfilNome}" deste usuario?`,
    );

    if (!confirmado) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmarDesvinculacao}>
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        Desvincular
      </button>
    </form>
  );
}
