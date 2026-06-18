"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type {
  LdapActiveDirectoryFormState,
  LdapActiveDirectoryInput,
} from "../../application/schemas/integracao.schema";

type LdapActiveDirectoryFormProps = {
  action: (
    state: LdapActiveDirectoryFormState,
    formData: FormData,
  ) => Promise<LdapActiveDirectoryFormState>;
  valoresIniciais: LdapActiveDirectoryInput & {
    possuiBindPassword: boolean;
  };
};

const estadoInicial: LdapActiveDirectoryFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: LdapActiveDirectoryFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function FieldError({
  estado,
  campo,
}: {
  estado: LdapActiveDirectoryFormState;
  campo: string;
}) {
  const mensagem = erro(estado, campo);

  if (!mensagem) {
    return null;
  }

  return <p className="text-sm text-red-600">{mensagem}</p>;
}

export function LdapActiveDirectoryForm({
  action,
  valoresIniciais,
}: LdapActiveDirectoryFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-lg border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold">Parâmetros de autenticação</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome da integração
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={String(campos.nome ?? "")}
              className="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            <FieldError estado={estado} campo="nome" />
          </div>

          <div className="space-y-2">
            <label htmlFor="modoAutenticacao" className="text-sm font-semibold">
              Modo
            </label>
            <select
              id="modoAutenticacao"
              name="modoAutenticacao"
              defaultValue={String(campos.modoAutenticacao ?? "HTTP_AD_API")}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="HTTP_AD_API">API HTTP do Active Directory</option>
              <option value="LDAP_BIND">Bind LDAP / Active Directory</option>
            </select>
            <FieldError estado={estado} campo="modoAutenticacao" />
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={Boolean(campos.ativo ?? true)}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Integração ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Quando inativa, o login ignora a integração externa e usa apenas
                a senha local cadastrada no SECP.
              </span>
            </span>
          </label>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="authUrl" className="text-sm font-semibold">
              URL da API de autenticação AD
            </label>
            <input
              id="authUrl"
              name="authUrl"
              type="url"
              defaultValue={String(campos.authUrl ?? "")}
              placeholder="http://login.ad.integracao.am.trf1.gov.br/auth/login"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="authUrl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="ldapUrl" className="text-sm font-semibold">
              Servidor LDAP/AD
            </label>
            <input
              id="ldapUrl"
              name="ldapUrl"
              defaultValue={String(campos.ldapUrl ?? "")}
              placeholder="ldap://srvdc1-am.jfam.local:389"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="ldapUrl" />
          </div>

          <div className="space-y-2">
            <label htmlFor="dominio" className="text-sm font-semibold">
              Domínio NetBIOS ou UPN
            </label>
            <input
              id="dominio"
              name="dominio"
              defaultValue={String(campos.dominio ?? "")}
              placeholder="JFAM ou jfam.local"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="dominio" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="baseDn" className="text-sm font-semibold">
              Base DN
            </label>
            <input
              id="baseDn"
              name="baseDn"
              defaultValue={String(campos.baseDn ?? "")}
              placeholder="DC=jfam,DC=local"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="baseDn" />
          </div>

          <div className="space-y-2">
            <label htmlFor="bindDn" className="text-sm font-semibold">
              Bind DN técnico
            </label>
            <input
              id="bindDn"
              name="bindDn"
              defaultValue={String(campos.bindDn ?? "")}
              placeholder="CN=secp,OU=Servicos,DC=jfam,DC=local"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="bindDn" />
          </div>

          <div className="space-y-2">
            <label htmlFor="bindPassword" className="text-sm font-semibold">
              Senha do bind técnico
            </label>
            <input
              id="bindPassword"
              name="bindPassword"
              type="password"
              placeholder={
                valoresIniciais.possuiBindPassword
                  ? "Senha já configurada; preencha para alterar"
                  : ""
              }
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="bindPassword" />
          </div>

          <div className="space-y-2">
            <label htmlFor="userDnPattern" className="text-sm font-semibold">
              Padrão de DN do usuário
            </label>
            <input
              id="userDnPattern"
              name="userDnPattern"
              defaultValue={String(campos.userDnPattern ?? "")}
              placeholder="CN={{matricula}},OU=Usuarios,DC=jfam,DC=local"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="userDnPattern" />
          </div>

          <div className="space-y-2">
            <label htmlFor="searchFilter" className="text-sm font-semibold">
              Filtro de busca
            </label>
            <input
              id="searchFilter"
              name="searchFilter"
              defaultValue={String(
                campos.searchFilter ?? "(sAMAccountName={{matricula}})",
              )}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="searchFilter" />
          </div>

          <div className="space-y-2">
            <label htmlFor="timeoutMs" className="text-sm font-semibold">
              Timeout (ms)
            </label>
            <input
              id="timeoutMs"
              name="timeoutMs"
              type="number"
              min={1000}
              max={60000}
              step={500}
              defaultValue={String(campos.timeoutMs ?? 5000)}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <FieldError estado={estado} campo="timeoutMs" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar parâmetros
        </button>
      </div>
    </form>
  );
}
