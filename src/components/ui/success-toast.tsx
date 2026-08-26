"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type SuccessToastProps = {
  mensagem: string;
};

export function SuccessToast({ mensagem }: SuccessToastProps) {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisivel(false), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 shadow-lg dark:border-green-900 dark:bg-green-950 dark:text-green-100"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700 dark:text-green-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Horário salvo</p>
        <p className="mt-1 text-green-800 dark:text-green-200">{mensagem}</p>
      </div>
      <button
        type="button"
        onClick={() => setVisivel(false)}
        className="rounded p-1 text-green-800 transition hover:bg-green-100 dark:text-green-200 dark:hover:bg-green-900"
        aria-label="Fechar notificação"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
