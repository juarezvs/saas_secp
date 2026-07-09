"use client";

import { useActionState, useState } from "react";
import { Database, Eye, EyeOff, Loader2, Save } from "lucide-react";

import type {
  SarhOracleFormState,
  SarhOracleInput,
} from "@/modules/integracoes/application/schemas/integracao.schema";

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type SarhOracleFormProps = {
  action: (
    estado: SarhOracleFormState,
    formData: FormData,
  ) => Promise<SarhOracleFormState>;
  valoresIniciais: SarhOracleInput & { possuiPassword?: boolean };
  orgaos: OrgaoItem[];
  permiteEscolherOrgao: boolean;
};

const estadoInicial: SarhOracleFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: SarhOracleFormState, campo: keyof SarhOracleInput) {
  return estado.erros?.[campo]?.[0];
}

function valor(
  estado: SarhOracleFormState,
  campo: keyof SarhOracleInput,
  fallback: unknown,
) {
  const valorCampo = estado.campos?.[campo];
  return String(valorCampo ?? fallback ?? "");
}

export function SarhOracleForm({
  action,
  valoresIniciais,
  orgaos,
  permiteEscolherOrgao,
}: SarhOracleFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start gap-3">
        <div className="secp-theme-icon rounded-lg p-2">
          <Database className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Conexão Oracle da seccional
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Estes parâmetros são usados pelo worker SARH somente para o job da
            seccional selecionada.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoItem
          label="Usuario Oracle"
          valor={valoresIniciais.username || "-"}
        />
        <ResumoItem
          label="String/TNS"
          valor={valoresIniciais.connectString || "-"}
        />
        <ResumoItem
          label="Localidade"
          valor={valoresIniciais.siglaLocalidade || "-"}
        />
        <ResumoItem
          label="Senha"
          valor={valoresIniciais.possuiPassword ? "Configurada" : "Pendente"}
        />
      </div>

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

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="sarh-orgaoId" className="text-sm font-semibold">
            Seccional
          </label>
          <select
            id="sarh-orgaoId"
            name="orgaoId"
            defaultValue={valor(estado, "orgaoId", valoresIniciais.orgaoId)}
            disabled={!permiteEscolherOrgao}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
          >
            {permiteEscolherOrgao && <option value="">Padrão do sistema</option>}
            {orgaos.map((orgao) => (
              <option key={orgao.id} value={orgao.id}>
                {orgao.sigla} - {orgao.nome}
              </option>
            ))}
          </select>
          {!permiteEscolherOrgao && (
            <input
              type="hidden"
              name="orgaoId"
              value={String(valoresIniciais.orgaoId ?? "")}
            />
          )}
          {erro(estado, "orgaoId") && (
            <p className="text-sm text-red-600">{erro(estado, "orgaoId")}</p>
          )}
        </div>

        <Campo
          label="Nome"
          name="nome"
          estado={estado}
          defaultValue={valoresIniciais.nome}
          erro={erro(estado, "nome")}
          required
        />
        <Campo
          label="Usuário Oracle"
          name="username"
          estado={estado}
          defaultValue={valoresIniciais.username}
          erro={erro(estado, "username")}
          required
        />
        <CampoSenha
          label="Senha Oracle"
          name="password"
          estado={estado}
          defaultValue={valoresIniciais.password}
          erro={erro(estado, "password")}
          mostrarSenha={mostrarSenha}
          onAlternarVisibilidade={() => setMostrarSenha((atual) => !atual)}
        />
        <Campo
          label="String/TNS Oracle"
          name="connectString"
          estado={estado}
          defaultValue={valoresIniciais.connectString}
          erro={erro(estado, "connectString")}
          required
        />
        <Campo
          label="Oracle Home / libDir"
          name="oracleHome"
          estado={estado}
          defaultValue={valoresIniciais.oracleHome}
          erro={erro(estado, "oracleHome")}
        />
        <Campo
          label="Sigla localidade SARH"
          name="siglaLocalidade"
          estado={estado}
          defaultValue={valoresIniciais.siglaLocalidade}
          erro={erro(estado, "siglaLocalidade")}
          required
        />

        <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={Boolean(valoresIniciais.ativo)}
          />
          <span>
            <span className="block font-semibold">Integração ativa</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Jobs desta seccional só executam quando a conexão está ativa.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Salvar conexão
        </button>
      </div>
    </form>
  );
}

function ResumoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <span className="block font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-1 block truncate font-medium text-slate-800 dark:text-slate-100">
        {valor}
      </span>
    </div>
  );
}

function Campo({
  label,
  name,
  estado,
  defaultValue,
  erro,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: keyof SarhOracleInput;
  estado: SarhOracleFormState;
  defaultValue?: unknown;
  erro?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={`sarh-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={`sarh-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={valor(estado, name, defaultValue)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function CampoSenha({
  label,
  name,
  estado,
  defaultValue,
  erro,
  mostrarSenha,
  onAlternarVisibilidade,
}: {
  label: string;
  name: keyof SarhOracleInput;
  estado: SarhOracleFormState;
  defaultValue?: unknown;
  erro?: string;
  mostrarSenha: boolean;
  onAlternarVisibilidade: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={`sarh-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={`sarh-${name}`}
          name={name}
          type={mostrarSenha ? "text" : "password"}
          defaultValue={valor(estado, name, defaultValue)}
          className="h-10 w-full rounded-md border bg-[var(--card)] px-3 pr-11 text-sm"
        />
        <button
          type="button"
          onClick={onAlternarVisibilidade}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-md text-slate-500 hover:bg-[var(--muted)] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          aria-label={mostrarSenha ? "Esconder senha" : "Ver senha"}
          title={mostrarSenha ? "Esconder senha" : "Ver senha"}
        >
          {mostrarSenha ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
