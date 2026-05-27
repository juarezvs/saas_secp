"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  tiposUsuario,
  type UsuarioFormState,
} from "../../application/schemas/usuario.schema";

type PerfilItem = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
};

type UsuarioFormProps = {
  action: (
    state: UsuarioFormState,
    formData: FormData
  ) => Promise<UsuarioFormState>;
  perfis: PerfilItem[];
  valoresIniciais?: {
    matricula?: string;
    nome?: string;
    email?: string | null;
    tipo?: string;
    ativo?: boolean;
    perfis?: string[];
  };
  modo: "criar" | "editar";
};

const estadoInicial: UsuarioFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipoUsuario: Record<string, string> = {
  SERVIDOR: "Servidor",
  SISTEMA: "Sistema",
  EXTERNO: "Externo",
  PRESTADOR: "Prestador",
  ESTAGIARIO: "Estagiário",
  VOLUNTARIO: "Voluntário",
};

function obterErro(
  erros: Record<string, string[]> | undefined,
  campo: string
) {
  return erros?.[campo]?.[0];
}

export function UsuarioForm({
  action,
  perfis,
  valoresIniciais,
  modo,
}: UsuarioFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = estado.campos ?? valoresIniciais;

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
        <h2 className="text-lg font-bold">Dados do usuário</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="matricula" className="text-sm font-semibold">
              Matrícula/Login
            </label>

            <input
              id="matricula"
              name="matricula"
              type="text"
              defaultValue={campos?.matricula ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "matricula") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "matricula")}
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
              defaultValue={campos?.tipo ?? "SERVIDOR"}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposUsuario.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipoUsuario[tipo] ?? tipo}
                </option>
              ))}
            </select>

            {obterErro(estado.erros, "tipo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "tipo")}
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
              type="text"
              defaultValue={campos?.nome ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "nome") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "nome")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              defaultValue={campos?.email ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "email") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "email")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="senha" className="text-sm font-semibold">
              {modo === "criar" ? "Senha local" : "Nova senha local"}
            </label>

            <input
              id="senha"
              name="senha"
              type="password"
              placeholder={
                modo === "criar"
                  ? "Opcional, exceto para login local"
                  : "Preencha apenas se quiser alterar"
              }
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "senha") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "senha")}
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
              <span className="block font-semibold">Usuário ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Usuários inativos não devem autenticar nem operar o sistema.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Perfis de acesso</h2>

        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Selecione os perfis que o usuário poderá utilizar no SECP.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {perfis.map((perfil) => (
            <label
              key={perfil.id}
              className="flex cursor-pointer gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm transition hover:border-blue-300"
            >
              <input
                type="checkbox"
                name="perfis"
                value={perfil.id}
                defaultChecked={(campos?.perfis ?? []).includes(perfil.id)}
                className="mt-1 size-4 rounded border-slate-300"
              />

              <span>
                <span className="block font-semibold">{perfil.nome}</span>
                <code className="mt-1 block text-xs text-[var(--muted-foreground)]">
                  {perfil.codigo}
                </code>

                {perfil.descricao && (
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                    {perfil.descricao}
                  </span>
                )}
              </span>
            </label>
          ))}
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

          {modo === "criar" ? "Criar usuário" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}