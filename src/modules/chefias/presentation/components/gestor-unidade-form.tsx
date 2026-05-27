"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  papeisGestao,
  type GestorUnidadeFormState,
} from "../../application/schemas/gestor-unidade.schema";

type UnidadeItem = {
  id: string;
  sigla: string;
  nome: string;
  tipo: string;
};

type ServidorItem = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
    email: string | null;
  };
  lotacoes: {
    unidade: {
      sigla: string;
    };
  }[];
};

type GestorUnidadeFormProps = {
  action: (
    state: GestorUnidadeFormState,
    formData: FormData
  ) => Promise<GestorUnidadeFormState>;
  unidades: UnidadeItem[];
  servidores: ServidorItem[];
  unidadeFixaId?: string;
};

const estadoInicial: GestorUnidadeFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosPapel: Record<string, string> = {
  GESTOR_TITULAR: "Gestor titular",
  GESTOR_SUBSTITUTO: "Gestor substituto",
  DELEGADO_CHEFIA: "Delegado da chefia",
};

function obterErro(
  erros: Record<string, string[]> | undefined,
  campo: string
) {
  return erros?.[campo]?.[0];
}

export function GestorUnidadeForm({
  action,
  unidades,
  servidores,
  unidadeFixaId,
}: GestorUnidadeFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold">Vincular chefia</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre gestor titular, substituto ou delegado responsável por
          validações e homologações da unidade.
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="unidadeId" className="text-sm font-semibold">
            Unidade
          </label>

          <select
            id="unidadeId"
            name="unidadeId"
            defaultValue={unidadeFixaId ?? estado.campos?.unidadeId ?? ""}
            disabled={Boolean(unidadeFixaId)}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition disabled:opacity-80 focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>

            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.sigla} — {unidade.nome}
              </option>
            ))}
          </select>

          {unidadeFixaId && (
            <input type="hidden" name="unidadeId" value={unidadeFixaId} />
          )}

          {obterErro(estado.erros, "unidadeId") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "unidadeId")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="servidorId" className="text-sm font-semibold">
            Servidor
          </label>

          <select
            id="servidorId"
            name="servidorId"
            defaultValue={estado.campos?.servidorId ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>

            {servidores.map((servidor) => {
              const lotacaoAtual = servidor.lotacoes[0]?.unidade.sigla;

              return (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} — {servidor.usuario.nome}
                  {lotacaoAtual ? ` (${lotacaoAtual})` : ""}
                </option>
              );
            })}
          </select>

          {obterErro(estado.erros, "servidorId") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "servidorId")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="papel" className="text-sm font-semibold">
            Papel
          </label>

          <select
            id="papel"
            name="papel"
            defaultValue={estado.campos?.papel ?? "GESTOR_TITULAR"}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            {papeisGestao.map((papel) => (
              <option key={papel} value={papel}>
                {rotulosPapel[papel] ?? papel}
              </option>
            ))}
          </select>

          {obterErro(estado.erros, "papel") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "papel")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataInicio" className="text-sm font-semibold">
            Data de início
          </label>

          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={estado.campos?.dataInicio ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          />

          {obterErro(estado.erros, "dataInicio") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "dataInicio")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataFim" className="text-sm font-semibold">
            Data final
          </label>

          <input
            id="dataFim"
            name="dataFim"
            type="date"
            defaultValue={estado.campos?.dataFim ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />

          {obterErro(estado.erros, "dataFim") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "dataFim")}
            </p>
          )}
        </div>

        <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={estado.campos?.ativo ?? true}
            className="size-4 rounded border-slate-300"
          />

          <span>
            <span className="block font-semibold">Vínculo ativo</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Chefias ativas poderão ser usadas nas próximas etapas de
              aprovação e homologação.
            </span>
          </span>
        </label>
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
            <Plus className="size-4" aria-hidden="true" />
          )}
          Vincular chefia
        </button>
      </div>
    </form>
  );
}