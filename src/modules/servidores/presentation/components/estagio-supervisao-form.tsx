"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
import type { EstagioSupervisaoState } from "../../application/actions/estagio-supervisao.action";

type SupervisorOption = {
  id: string;
  label: string;
};

type Props = {
  action: (
    state: EstagioSupervisaoState,
    formData: FormData,
  ) => Promise<EstagioSupervisaoState>;
  supervisores: SupervisorOption[];
};

const estadoInicial: EstagioSupervisaoState = {
  erro: null,
  sucesso: null,
};

export function EstagioSupervisaoForm({ action, supervisores }: Props) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="rounded-xl border bg-[var(--card)] p-5">
      <h3 className="text-base font-semibold">Nova supervisao</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supervisorServidorId" className="text-sm font-semibold">
            Supervisor
          </label>
          <SearchableSelect
            id="supervisorServidorId"
            name="supervisorServidorId"
            placeholder="Selecione"
            searchPlaceholder="Pesquisar supervisor..."
            emptyMessage="Nenhum supervisor encontrado."
            options={supervisores.map((supervisor) => ({
              value: supervisor.id,
              label: supervisor.label,
              searchText: supervisor.label,
            }))}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="dataInicio" className="text-sm font-semibold">
            Inicio
          </label>
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            required
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="curso" className="text-sm font-semibold">
            Curso
          </label>
          <input
            id="curso"
            name="curso"
            maxLength={180}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="observacao" className="text-sm font-semibold">
            Observacao
          </label>
          <textarea
            id="observacao"
            name="observacao"
            rows={3}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {estado.erro ? (
        <p className="mt-4 text-sm font-semibold text-red-700 dark:text-red-300">
          {estado.erro}
        </p>
      ) : null}
      {estado.sucesso ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {estado.sucesso}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          Registrar
        </button>
      </div>
    </form>
  );
}
