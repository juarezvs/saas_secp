"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { JornadaServidorFormState } from "../../application/schemas/jornada-servidor.schema";

type ServidorItem = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
  lotacoes: {
    unidade: {
      sigla: string;
    };
  }[];
};

type JornadaItem = {
  id: string;
  codigo: string;
  nome: string;
};

type JornadaServidorFormProps = {
  action: (
    state: JornadaServidorFormState,
    formData: FormData
  ) => Promise<JornadaServidorFormState>;
  servidores: ServidorItem[];
  jornadas: JornadaItem[];
};

const estadoInicial: JornadaServidorFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: JornadaServidorFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function JornadaServidorForm({
  action,
  servidores,
  jornadas,
}: JornadaServidorFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold">Atribuir jornada ao servidor</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          A jornada vigente será usada futuramente para apuração diária, carga
          mensal, banco de horas e homologação.
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
          <label htmlFor="servidorId" className="text-sm font-semibold">
            Servidor
          </label>
          <select
            id="servidorId"
            name="servidorId"
            defaultValue={estado.campos?.servidorId ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>
            {servidores.map((servidor) => {
              const lotacao = servidor.lotacoes[0]?.unidade.sigla;
              return (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} — {servidor.usuario.nome}
                  {lotacao ? ` (${lotacao})` : ""}
                </option>
              );
            })}
          </select>
          {erro(estado, "servidorId") && (
            <p className="text-sm text-red-600">{erro(estado, "servidorId")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="jornadaId" className="text-sm font-semibold">
            Jornada
          </label>
          <select
            id="jornadaId"
            name="jornadaId"
            defaultValue={estado.campos?.jornadaId ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>
            {jornadas.map((jornada) => (
              <option key={jornada.id} value={jornada.id}>
                {jornada.codigo} — {jornada.nome}
              </option>
            ))}
          </select>
          {erro(estado, "jornadaId") && (
            <p className="text-sm text-red-600">{erro(estado, "jornadaId")}</p>
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
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          />
          {erro(estado, "dataInicio") && (
            <p className="text-sm text-red-600">{erro(estado, "dataInicio")}</p>
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
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="justificativa" className="text-sm font-semibold">
            Justificativa
          </label>
          <textarea
            id="justificativa"
            name="justificativa"
            defaultValue={estado.campos?.justificativa ?? ""}
            rows={3}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            placeholder="Informe a base administrativa ou justificativa da atribuição."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Atribuir jornada
        </button>
      </div>
    </form>
  );
}