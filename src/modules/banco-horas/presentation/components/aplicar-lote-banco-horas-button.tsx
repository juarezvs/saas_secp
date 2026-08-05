"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, Save } from "lucide-react";

export function AplicarLoteBancoHorasButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 lg:col-span-2 lg:mt-6"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Save className="size-4" aria-hidden="true" />
      )}
      {pending ? "Aplicando..." : "Aplicar lote"}
    </button>
  );
}
