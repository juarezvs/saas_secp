"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { FusoHorarioFormState } from "../../application/schemas/fuso-horario.schema";

type FusoHorarioFormProps = {
  action: (
    state: FusoHorarioFormState,
    formData: FormData,
  ) => Promise<FusoHorarioFormState>;
  modo: "criar" | "editar";
  valoresIniciais?: {
    valor?: string;
    rotulo?: string;
    descricao?: string | null;
    ativo?: boolean;
  };
};

const estadoInicial: FusoHorarioFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: FusoHorarioFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function FusoHorarioForm({
  action,
  modo,
  valoresIniciais,
}: FusoHorarioFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-lg border p-4 text-sm ${
            estado.sucesso
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-lg border bg-[var(--card)] p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="valor" className="text-sm font-semibold">
              Identificador IANA
            </label>
            <input
              id="valor"
              name="valor"
              defaultValue={campos?.valor ?? ""}
              placeholder="Ex.: America/Manaus"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "valor") && (
              <p className="text-sm text-red-600">{erro(estado, "valor")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="rotulo" className="text-sm font-semibold">
              Rotulo de exibicao
            </label>
            <input
              id="rotulo"
              name="rotulo"
              defaultValue={campos?.rotulo ?? ""}
              placeholder="Ex.: Manaus (UTC-04)"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "rotulo") && (
              <p className="text-sm text-red-600">{erro(estado, "rotulo")}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Descricao
            </label>
            <textarea
              id="descricao"
              name="descricao"
              rows={4}
              defaultValue={campos?.descricao ?? ""}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "descricao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "descricao")}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Fuso ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Apenas fusos ativos aparecem para selecao em orgaos e unidades.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {modo === "criar" ? "Criar fuso" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
