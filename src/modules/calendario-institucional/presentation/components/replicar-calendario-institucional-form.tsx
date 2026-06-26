"use client";

import { useActionState } from "react";
import { Copy, Loader2 } from "lucide-react";

import {
  replicarCalendarioInstitucionalAction,
  type ReplicarCalendarioInstitucionalState,
} from "../../application/actions/replicar-calendario-institucional.action";

const estadoInicial: ReplicarCalendarioInstitucionalState = {
  sucesso: false,
  mensagem: null,
};

export function ReplicarCalendarioInstitucionalForm({
  anoAtual,
}: {
  anoAtual: number;
}) {
  const [estado, formAction, pendente] = useActionState(
    replicarCalendarioInstitucionalAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">Replicar calendário anual</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Copia eventos do ano de origem para o ano destino mantendo mês e
            dia. Datas já cadastradas no destino são ignoradas. Feriados móveis
            devem ser conferidos e ajustados manualmente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[8rem_8rem_auto_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold">Origem</span>
            <input
              name="anoOrigem"
              type="number"
              min={2000}
              max={2100}
              defaultValue={anoAtual}
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold">Destino</span>
            <input
              name="anoDestino"
              type="number"
              min={2000}
              max={2100}
              defaultValue={anoAtual + 1}
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-[var(--muted)] px-3 text-sm font-semibold sm:self-end">
            <input
              type="checkbox"
              name="somenteAtivos"
              defaultChecked
              className="size-4 rounded border-slate-300"
            />
            Apenas ativos
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70 sm:self-end"
          >
            {pendente ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            Replicar
          </button>
        </div>
      </div>

      {estado.mensagem && (
        <div
          role="status"
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {estado.mensagem}
        </div>
      )}
    </form>
  );
}
