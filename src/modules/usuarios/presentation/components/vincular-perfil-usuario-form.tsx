"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { SearchableSelect } from "@/components/ui";

import { vincularPerfilUsuarioAction } from "../../application/actions/vincular-perfil-usuario.action";
import type { VincularPerfilUsuarioFormState } from "../../application/schemas/usuario.schema";

type PerfilItem = {
  id: string;
  codigo: string;
  nome: string;
};

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

const estadoInicial: VincularPerfilUsuarioFormState = {
  sucesso: false,
  mensagem: null,
};

export function VincularPerfilUsuarioForm({
  usuarioId,
  perfis,
  orgaos,
  permitirEscopoGlobal,
}: {
  usuarioId: string;
  perfis: PerfilItem[];
  orgaos: OrgaoItem[];
  permitirEscopoGlobal: boolean;
}) {
  const router = useRouter();
  const [estado, formAction, pendente] = useActionState(
    vincularPerfilUsuarioAction,
    estadoInicial,
  );

  useEffect(() => {
    if (estado.sucesso) {
      router.refresh();
    }
  }, [estado.sucesso, router]);

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
        <SearchableSelect
          id="vincular-perfil-perfil"
          name="perfilId"
          defaultValue=""
          className="flex-1"
          placeholder="Selecione o perfil"
          searchPlaceholder="Pesquisar perfil..."
          emptyMessage="Nenhum perfil encontrado."
          options={perfis.map((perfil) => ({
            value: perfil.id,
            label: `${perfil.codigo} - ${perfil.nome}`,
            searchText: `${perfil.codigo} ${perfil.nome}`,
          }))}
          required
        />

        <SearchableSelect
          id="vincular-perfil-orgao"
          name="orgaoId"
          defaultValue=""
          className="flex-1"
          placeholder={
            permitirEscopoGlobal
              ? "Global (somente Master)"
              : "Selecione a seccional"
          }
          searchPlaceholder="Pesquisar seccional..."
          emptyMessage="Nenhuma seccional encontrada."
          options={orgaos.map((orgao) => ({
            value: orgao.id,
            label: `${orgao.sigla} - ${orgao.nome}`,
            searchText: `${orgao.sigla} ${orgao.nome}`,
          }))}
          required={!permitirEscopoGlobal}
        />

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
