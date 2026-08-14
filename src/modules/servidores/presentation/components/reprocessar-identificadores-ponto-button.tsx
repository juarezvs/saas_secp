"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";

import type { ReprocessarIdentificadoresPontoServidorState } from "../../application/actions/reprocessar-identificadores-ponto-servidor.action";

type ReprocessarIdentificadoresPontoButtonProps = {
  action: (
    state: ReprocessarIdentificadoresPontoServidorState,
  ) => Promise<ReprocessarIdentificadoresPontoServidorState>;
};

const estadoInicial: ReprocessarIdentificadoresPontoServidorState = {
  sucesso: false,
  mensagem: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <RefreshCw
        className={`size-4 ${pending ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      Reprocessar pendentes
    </button>
  );
}

export function ReprocessarIdentificadoresPontoButton({
  action,
}: ReprocessarIdentificadoresPontoButtonProps) {
  const [estado, formAction] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton />

      {estado.mensagem && (
        <p
          className={`text-xs leading-5 ${
            estado.sucesso
              ? "text-green-700 dark:text-green-300"
              : "text-red-700 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
          {estado.erros ? ` Erros: ${estado.erros}.` : ""}
          {estado.aindaPendentes
            ? ` Ainda pendentes: ${estado.aindaPendentes}.`
            : ""}
        </p>
      )}
    </form>
  );
}
