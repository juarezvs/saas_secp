"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RegulamentacaoPontoSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? "Salvando regras..." : "Salvar regras do órgão"}
    </button>
  );
}
