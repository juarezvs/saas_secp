"use client";

import { useState, type ReactNode } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";

type AbaMarcacoesBrutas = "marcacoes" | "reprocessamento";

export function MarcacoesBrutasPageTabs({
  marcacoes,
  reprocessamento,
}: {
  marcacoes: ReactNode;
  reprocessamento?: ReactNode;
}) {
  const [aba, setAba] = useState<AbaMarcacoesBrutas>("marcacoes");

  return (
    <section className="space-y-4">
      <div
        className="flex flex-wrap gap-2 rounded-xl border bg-[var(--card)] p-2 shadow-sm"
        role="tablist"
        aria-label="Marcacoes brutas"
      >
        <button
          type="button"
          role="tab"
          aria-selected={aba === "marcacoes"}
          onClick={() => setAba("marcacoes")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
            aba === "marcacoes"
              ? "bg-blue-900 text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <DatabaseZap className="size-4" aria-hidden="true" />
          Marcacoes brutas
        </button>

        {reprocessamento && (
          <button
            type="button"
            role="tab"
            aria-selected={aba === "reprocessamento"}
            onClick={() => setAba("reprocessamento")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
              aba === "reprocessamento"
                ? "bg-blue-900 text-white"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Reprocessamento
          </button>
        )}
      </div>

      <div role="tabpanel">
        {aba === "marcacoes" || !reprocessamento
          ? marcacoes
          : reprocessamento}
      </div>
    </section>
  );
}
