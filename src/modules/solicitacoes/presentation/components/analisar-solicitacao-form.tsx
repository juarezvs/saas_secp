"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { AnalisarSolicitacaoFormState } from "../../application/schemas/solicitacao.schema";

type AnalisarSolicitacaoFormProps = {
  action: (
    state: AnalisarSolicitacaoFormState,
    formData: FormData
  ) => Promise<AnalisarSolicitacaoFormState>;
};

const estadoInicial: AnalisarSolicitacaoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: AnalisarSolicitacaoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function AnalisarSolicitacaoForm({
  action,
}: AnalisarSolicitacaoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold">Analisar solicitação</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Informe a decisão e registre a justificativa da análise.
        </p>
      </div>

      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-lg border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="resultado" className="text-sm font-semibold">
          Resultado
        </label>

        <select
          id="resultado"
          name="resultado"
          defaultValue="DEFERIR"
          className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          required
        >
          <option value="DEFERIR">Deferir</option>
          <option value="INDEFERIR">Indeferir</option>
        </select>

        {erro(estado, "resultado") && (
          <p className="text-sm text-red-600">{erro(estado, "resultado")}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="justificativaAnalise" className="text-sm font-semibold">
          Justificativa da análise
        </label>

        <textarea
          id="justificativaAnalise"
          name="justificativaAnalise"
          rows={5}
          className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          required
        />

        {erro(estado, "justificativaAnalise") && (
          <p className="text-sm text-red-600">
            {erro(estado, "justificativaAnalise")}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          Registrar análise
        </button>
      </div>
    </form>
  );
}