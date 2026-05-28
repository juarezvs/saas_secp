"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { registrarEquipamentoBiometricoAction } from "../../application/actions/registrar-equipamento-biometrico.action";
import type { EquipamentoBiometricoFormState } from "../../application/schemas/integracao.schema";

type UnidadeItem = {
  id: string;
  sigla: string;
  nome: string;
};

const estadoInicial: EquipamentoBiometricoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: EquipamentoBiometricoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function EquipamentoBiometricoForm({
  unidades,
}: {
  unidades: UnidadeItem[];
}) {
  const [estado, formAction, pendente] = useActionState(
    registrarEquipamentoBiometricoAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <h2 className="text-lg font-bold">Cadastrar equipamento biométrico</h2>

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
        <Campo
          label="Código"
          name="codigo"
          erro={erro(estado, "codigo")}
          required
        />

        <Campo label="Nome" name="nome" erro={erro(estado, "nome")} required />

        <div className="space-y-2">
          <label htmlFor="unidadeId" className="text-sm font-semibold">
            Unidade
          </label>

          <select
            id="unidadeId"
            name="unidadeId"
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Sem unidade vinculada</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.sigla} — {unidade.nome}
              </option>
            ))}
          </select>
        </div>

        <Campo label="Fabricante" name="fabricante" />
        <Campo label="Modelo" name="modelo" />
        <Campo label="Número de série" name="numeroSerie" />
        <Campo label="Localização" name="localizacao" />
        <Campo label="IP" name="ip" />
        <Campo label="Porta" name="porta" type="number" />

        <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          <span>
            <span className="block font-semibold">Equipamento ativo</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Equipamentos inativos não devem gerar marcações.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar equipamento
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  name,
  type = "text",
  erro,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  erro?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
