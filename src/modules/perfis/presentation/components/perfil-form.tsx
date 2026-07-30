"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { PerfilFormState } from "../../application/schemas/perfil.schema";
import { PermissoesCheckboxList } from "./permissoes-checkbox-list";

type PermissaoItem = {
  id: string;
  codigo: string;
  recurso: string;
  acao: string;
  escopo: string;
  descricao: string | null;
};

type PerfilFormProps = {
  action: (
    state: PerfilFormState,
    formData: FormData
  ) => Promise<PerfilFormState>;
  permissoes: PermissaoItem[];
  perfisDestinoExcecao: Array<{
    id: string;
    codigo: string;
    nome: string;
  }>;
  valoresIniciais?: {
    codigo?: string;
    nome?: string;
    descricao?: string | null;
    ativo?: boolean;
    administrativo?: boolean;
    excecao?: boolean;
    perfilDestinoExcecaoId?: string | null;
    permissoes?: string[];
  };
  modo: "criar" | "editar";
};

const estadoInicial: PerfilFormState = {
  sucesso: false,
  mensagem: null,
};

function obterErro(
  erros: Record<string, string[]> | undefined,
  campo: string
) {
  return erros?.[campo]?.[0];
}

export function PerfilForm({
  action,
  permissoes,
  perfisDestinoExcecao,
  valoresIniciais,
  modo,
}: PerfilFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = estado.campos ?? valoresIniciais;
  const [excecaoAtiva, setExcecaoAtiva] = useState(
    campos?.excecao ?? false,
  );

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
        <h2 className="text-lg font-bold">Dados do perfil</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Código
            </label>

            <input
              id="codigo"
              name="codigo"
              type="text"
              defaultValue={campos?.codigo ?? ""}
              placeholder="Ex.: GESTOR_UNIDADE"
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
              type="text"
              defaultValue={campos?.nome ?? ""}
              placeholder="Ex.: Gestor de unidade"
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
              Descrição
            </label>

            <textarea
              id="descricao"
              name="descricao"
              defaultValue={campos?.descricao ?? ""}
              rows={4}
              placeholder="Descreva a finalidade institucional deste perfil."
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "descricao") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "descricao")}
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
              <span className="block font-semibold">Perfil ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Perfis inativos não devem ser atribuídos a novos usuários.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="administrativo"
              defaultChecked={campos?.administrativo ?? false}
              className="size-4 rounded border-slate-300"
            />

            <span>
              <span className="block font-semibold">Perfil administrativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Organiza o menu como rotina administrativa e oculta atalhos
                operacionais individuais.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="excecao"
              defaultChecked={campos?.excecao ?? false}
              onChange={(event) => setExcecaoAtiva(event.currentTarget.checked)}
              className="size-4 rounded border-slate-300"
            />

            <span>
              <span className="block font-semibold">Perfil de excecao</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Mantem o perfil oculto na troca de perfil e injeta suas
                permissoes no perfil nao administrativo da pessoa vinculada.
              </span>
            </span>
          </label>

          {excecaoAtiva ? (
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="perfilDestinoExcecaoId"
                className="text-sm font-semibold"
              >
                Perfil que recebera as permissoes da excecao
              </label>

              <select
                id="perfilDestinoExcecaoId"
                name="perfilDestinoExcecaoId"
                defaultValue={campos?.perfilDestinoExcecaoId ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                required
              >
                <option value="">Selecione um perfil</option>
                {perfisDestinoExcecao.map((perfil) => (
                  <option key={perfil.id} value={perfil.id}>
                    {perfil.nome} ({perfil.codigo})
                  </option>
                ))}
              </select>

              {obterErro(estado.erros, "perfilDestinoExcecaoId") && (
                <p className="text-sm text-red-600">
                  {obterErro(estado.erros, "perfilDestinoExcecaoId")}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Permissões</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Selecione as permissões que serão atribuídas a este perfil.
          </p>
        </div>

        <PermissoesCheckboxList
          permissoes={permissoes}
          permissoesSelecionadas={campos?.permissoes ?? []}
        />
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}

          {modo === "criar" ? "Criar perfil" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
