"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { RecessoFormState } from "../../application/schemas/recesso-forense.schema";

type RecessoForenseFormProps = {
  action: (
    state: RecessoFormState,
    formData: FormData,
  ) => Promise<RecessoFormState>;
  orgaos: Array<{
    id: string;
    sigla: string;
    nome: string;
  }>;
};

const estadoInicial: RecessoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: RecessoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function RecessoForenseForm({
  action,
  orgaos,
}: RecessoForenseFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const anoAtual = new Date().getFullYear();
  const orgaoPadrao = String(estado.campos?.orgaoId ?? orgaos[0]?.id ?? "");

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-bold">Dados do recesso</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          O período será definido automaticamente de 20/12 do ano informado a
          06/01 do ano seguinte.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="orgaoId" className="text-sm font-semibold">
              Seccional
            </label>
            <select
              id="orgaoId"
              name="orgaoId"
              defaultValue={orgaoPadrao}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {orgaos.map((orgao) => (
                <option key={orgao.id} value={orgao.id}>
                  {orgao.sigla} - {orgao.nome}
                </option>
              ))}
            </select>
            {erro(estado, "orgaoId") && (
              <p className="text-sm text-red-600">{erro(estado, "orgaoId")}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="ano" className="text-sm font-semibold">
              Ano de referência
            </label>
            <input
              id="ano"
              name="ano"
              type="number"
              min={2024}
              max={2100}
              defaultValue={Number(estado.campos?.ano ?? anoAtual)}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "ano") && (
              <p className="text-sm text-red-600">{erro(estado, "ano")}</p>
            )}
          </div>

          <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <p className="font-semibold">Regra fixa</p>
            <p className="mt-1 text-[var(--muted-foreground)]">
              De 20/12 a 06/01, com fechamento separado para dezembro e janeiro.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="observacao" className="text-sm font-semibold">
              Observacao
            </label>
            <textarea
              id="observacao"
              name="observacao"
              rows={4}
              defaultValue={String(estado.campos?.observacao ?? "")}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Criar recesso
        </button>
      </div>
    </form>
  );
}
