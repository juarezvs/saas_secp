"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  tiposLotacao,
  type LotacaoFormState,
} from "../../application/schemas/lotacao.schema";

type UnidadeItem = {
  id: string;
  sigla: string;
  nome: string;
  tipo: string;
};

type LotacaoFormProps = {
  action: (
    state: LotacaoFormState,
    formData: FormData
  ) => Promise<LotacaoFormState>;
  unidades: UnidadeItem[];
};

const estadoInicial: LotacaoFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosLotacao: Record<string, string> = {
  TITULAR: "Titular",
  PROVISORIA: "Provisória",
  SUBSTITUICAO: "Substituição",
};

function obterErro(
  erros: Record<string, string[]> | undefined,
  campo: string
) {
  return erros?.[campo]?.[0];
}

export function LotacaoForm({ action, unidades }: LotacaoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">Nova lotação</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Ao criar uma lotação sem data final, as lotações abertas anteriores
          serão encerradas automaticamente.
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
            defaultValue={estado.campos?.unidadeId ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>

            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.sigla} — {unidade.nome}
              </option>
            ))}
          </select>

          {obterErro(estado.erros, "unidadeId") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "unidadeId")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="tipo" className="text-sm font-semibold">
            Tipo
          </label>

          <select
            id="tipo"
            name="tipo"
            defaultValue={estado.campos?.tipo ?? "TITULAR"}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            {tiposLotacao.map((tipo) => (
              <option key={tipo} value={tipo}>
                {rotulosLotacao[tipo] ?? tipo}
              </option>
            ))}
          </select>

          {obterErro(estado.erros, "tipo") && (
            <p className="text-sm text-red-600">
              {obterErro(estado.erros, "tipo")}
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
          Vincular lotação
        </button>
      </div>
    </form>
  );
}