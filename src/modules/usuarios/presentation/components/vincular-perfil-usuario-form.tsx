"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { vincularPerfilUsuarioAction } from "../../application/actions/vincular-perfil-usuario.action";
import type { VincularPerfilUsuarioFormState } from "../../application/schemas/usuario.schema";

type PerfilItem = {
  id: string;
  codigo: string;
  nome: string;
};

const estadoInicial: VincularPerfilUsuarioFormState = {
  sucesso: false,
  mensagem: null,
};

export function VincularPerfilUsuarioForm({
  usuarioId,
  perfis,
}: {
  usuarioId: string;
  perfis: PerfilItem[];
}) {
  const [estado, formAction, pendente] = useActionState(
    vincularPerfilUsuarioAction,
    estadoInicial
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <h2 className="text-lg font-bold">Vincular perfil</h2>

      <input type="hidden" name="usuarioId" value={usuarioId} />

      {estado.mensagem && (
        <div
          role="alert"
          className={`mt-4 rounded-lg border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <select
          name="perfilId"
          defaultValue=""
          className="h-10 flex-1 rounded-md border bg-[var(--card)] px-3 text-sm"
          required
        >
          <option value="">Selecione o perfil</option>

          {perfis.map((perfil) => (
            <option key={perfil.id} value={perfil.id}>
              {perfil.codigo} — {perfil.nome}
            </option>
          ))}
        </select>

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
          Vincular
        </button>
      </div>
    </form>
  );
}