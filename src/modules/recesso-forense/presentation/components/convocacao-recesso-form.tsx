"use client";

import { useActionState } from "react";
import { Loader2, Save, UserPlus } from "lucide-react";

import type { RecessoFormState } from "../../application/schemas/recesso-forense.schema";

type UnidadeOption = {
  id: string;
  sigla: string;
  nome: string;
};

type ServidorOption = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
};

type ConvocacaoRecessoFormProps = {
  recessoId: string;
  action: (
    state: RecessoFormState,
    formData: FormData,
  ) => Promise<RecessoFormState>;
  unidades: UnidadeOption[];
  servidores: ServidorOption[];
};

const estadoInicial: RecessoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: RecessoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function ConvocacaoRecessoForm({
  recessoId,
  action,
  unidades,
  servidores,
}: ConvocacaoRecessoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
      <input type="hidden" name="recessoId" value={recessoId} />

      <div className="flex items-center gap-2">
        <UserPlus className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Portaria de convocacao</h2>
      </div>

      {estado.mensagem && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {estado.mensagem}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="numeroPortaria" className="text-sm font-semibold">
            Numero da portaria
          </label>
          <input
            id="numeroPortaria"
            name="numeroPortaria"
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          />
          {erro(estado, "numeroPortaria") && (
            <p className="text-sm text-red-600">
              {erro(estado, "numeroPortaria")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataPortaria" className="text-sm font-semibold">
            Data da portaria
          </label>
          <input
            id="dataPortaria"
            name="dataPortaria"
            type="date"
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="unidadeId" className="text-sm font-semibold">
            Unidade
          </label>
          <select
            id="unidadeId"
            name="unidadeId"
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Todas / nao informada</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.sigla} - {unidade.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="chefiaResponsavelId" className="text-sm font-semibold">
            Chefia do recesso
          </label>
          <select
            id="chefiaResponsavelId"
            name="chefiaResponsavelId"
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Definir depois</option>
            {servidores.map((servidor) => (
              <option key={servidor.id} value={servidor.id}>
                {servidor.matricula} - {servidor.usuario.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="descricao" className="text-sm font-semibold">
            Descricao
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Criar convocacao
        </button>
      </div>
    </form>
  );
}
