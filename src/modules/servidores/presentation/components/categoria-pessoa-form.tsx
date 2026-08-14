"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { CategoriaPessoaFormState } from "../../application/schemas/categoria-pessoa.schema";

type CategoriaPessoaFormProps = {
  action: (
    state: CategoriaPessoaFormState,
    formData: FormData,
  ) => Promise<CategoriaPessoaFormState>;
  valoresIniciais?: {
    codigo?: string;
    nome?: string;
    descricao?: string | null;
    ativo?: boolean;
  };
  modo: "criar" | "editar";
};

const estadoInicial: CategoriaPessoaFormState = {
  sucesso: false,
  mensagem: null,
};

function obterErro(erros: Record<string, string[]> | undefined, campo: string) {
  return erros?.[campo]?.[0];
}

export function CategoriaPessoaForm({
  action,
  valoresIniciais,
  modo,
}: CategoriaPessoaFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = {
    ...valoresIniciais,
    ...estado.campos,
  };

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Dados da categoria</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Codigo
            </label>
            <input
              id="codigo"
              name="codigo"
              defaultValue={campos.codigo ?? ""}
              placeholder="Ex.: SERVIDOR"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {obterErro(estado.erros, "codigo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "codigo")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={campos.nome ?? ""}
              placeholder="Ex.: Servidor"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {obterErro(estado.erros, "nome") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "nome")}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Descricao
            </label>
            <textarea
              id="descricao"
              name="descricao"
              defaultValue={campos.descricao ?? ""}
              rows={4}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Categoria ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Categorias inativas deixam de aparecer em novos cadastros.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {modo === "criar" ? "Criar categoria" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
