"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  tiposVinculoServidor,
  type ServidorFormState,
} from "../../application/schemas/servidor.schema";

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type ServidorFormProps = {
  action: (
    state: ServidorFormState,
    formData: FormData,
  ) => Promise<ServidorFormState>;
  orgaos: OrgaoItem[];
  valoresIniciais?: {
    orgaoId?: string;
    matricula?: string;
    cpf: string;
    nome?: string;
    email?: string | null;
    nomeFuncional?: string | null;
    vinculo?: string;
    ativo?: boolean;
  };
  modo: "criar" | "editar";
};

const estadoInicial: ServidorFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosVinculo: Record<string, string> = {
  EFETIVO: "Efetivo",
  CEDIDO: "Cedido",
  REQUISITADO: "Requisitado",
  REDISTRIBUIDO: "Redistribuído",
  REMOVIDO: "Removido",
  EXERCICIO_PROVISORIO: "Exercício provisório",
};

function obterErro(erros: Record<string, string[]> | undefined, campo: string) {
  return erros?.[campo]?.[0];
}

export function ServidorForm({
  action,
  orgaos,
  valoresIniciais,
  modo,
}: ServidorFormProps) {
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

      <section className="rounded-xl border bg-(--card) p-6 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Dados funcionais</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="orgaoId" className="text-sm font-semibold">
              Órgão
            </label>

            <select
              id="orgaoId"
              name="orgaoId"
              defaultValue={campos?.orgaoId ?? ""}
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              <option value="">Selecione</option>
              {orgaos.map((orgao) => (
                <option key={orgao.id} value={orgao.id}>
                  {orgao.sigla} — {orgao.nome}
                </option>
              ))}
            </select>

            {obterErro(estado.erros, "orgaoId") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "orgaoId")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="matricula" className="text-sm font-semibold">
              Matrícula
            </label>

            <input
              id="matricula"
              name="matricula"
              type="text"
              defaultValue={campos?.matricula ?? ""}
              placeholder="Ex.: AM12345"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "matricula") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "matricula")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-semibold">
              CPF
            </label>

            <input
              id="cpf"
              name="cpf"
              defaultValue={campos?.cpf ?? ""}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className="h-10 w-full rounded-md border bg-(--card) px-3 text-sm"
            />

            {obterErro(estado.erros, "cpf") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "cpf")}
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
              placeholder="Nome completo"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
              placeholder="nome@trf1.jus.br"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "email") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "email")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nomeFuncional" className="text-sm font-semibold">
              Nome funcional
            </label>

            <input
              id="nomeFuncional"
              name="nomeFuncional"
              type="text"
              defaultValue={campos?.nomeFuncional ?? ""}
              placeholder="Opcional"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "nomeFuncional") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "nomeFuncional")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="vinculo" className="text-sm font-semibold">
              Tipo de vínculo
            </label>

            <select
              id="vinculo"
              name="vinculo"
              defaultValue={campos?.vinculo ?? "EFETIVO"}
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposVinculoServidor.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosVinculo[tipo] ?? tipo}
                </option>
              ))}
            </select>

            {obterErro(estado.erros, "vinculo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "vinculo")}
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
              <span className="block font-semibold">Servidor ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Servidores inativos não devem registrar frequência ordinária.
              </span>
            </span>
          </label>
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

          {modo === "criar" ? "Criar servidor" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
