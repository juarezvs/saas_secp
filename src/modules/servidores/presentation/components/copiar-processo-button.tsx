"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopiarProcessoButtonProps = {
  processo: string;
};

export function CopiarProcessoButton({ processo }: CopiarProcessoButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiarProcesso() {
    await navigator.clipboard.writeText(processo);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copiarProcesso}
      className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-[var(--muted-foreground)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:border-blue-800 dark:hover:bg-blue-950 dark:hover:text-blue-200"
      aria-label={`Copiar processo ${processo}`}
      title={copiado ? "Processo copiado" : "Copiar processo"}
    >
      {copiado ? (
        <Check className="size-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
