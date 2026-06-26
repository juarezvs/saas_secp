"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { OrgaoFormState } from "../../application/schemas/orgao.schema";

type OrgaoFormProps = {
  action: (
    state: OrgaoFormState,
    formData: FormData,
  ) => Promise<OrgaoFormState>;
  modo: "criar" | "editar";
  valoresIniciais?: {
    sigla?: string;
    nome?: string;
    codigoExternoSarh?: number | null;
    fusoHorario?: string | null;
    ativo?: boolean;
  };
  fusosHorarios?: {
    valor: string;
    rotulo: string;
  }[];
};

const estadoInicial: OrgaoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: OrgaoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function OrgaoForm({
  action,
  modo,
  valoresIniciais,
  fusosHorarios = [],
}: OrgaoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;
  const opcoesFuso =
    fusosHorarios.length > 0
      ? fusosHorarios
      : [{ valor: "America/Manaus", rotulo: "Manaus (UTC-04)" }];

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

      <section className="rounded-lg border bg-[var(--card)] p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="sigla" className="text-sm font-semibold">
              Sigla
            </label>
            <input
              id="sigla"
              name="sigla"
              defaultValue={campos?.sigla ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "sigla") && (
              <p className="text-sm text-red-600">{erro(estado, "sigla")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="codigoExternoSarh" className="text-sm font-semibold">
              Codigo SARH
            </label>
            <input
              id="codigoExternoSarh"
              name="codigoExternoSarh"
              type="number"
              defaultValue={campos?.codigoExternoSarh ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "codigoExternoSarh") && (
              <p className="text-sm text-red-600">
                {erro(estado, "codigoExternoSarh")}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={campos?.nome ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "nome") && (
              <p className="text-sm text-red-600">{erro(estado, "nome")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="fusoHorario" className="text-sm font-semibold">
              Fuso horario
            </label>
            <select
              id="fusoHorario"
              name="fusoHorario"
              defaultValue={campos?.fusoHorario ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            >
              {opcoesFuso.map((fuso) => (
                <option key={fuso.valor} value={fuso.valor}>
                  {fuso.rotulo}
                </option>
              ))}
            </select>
            {erro(estado, "fusoHorario") && (
              <p className="text-sm text-red-600">
                {erro(estado, "fusoHorario")}
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
              <span className="block font-semibold">Orgao ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Orgaos inativos deixam de aparecer em novas vinculacoes.
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
          {modo === "criar" ? "Criar orgao" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
