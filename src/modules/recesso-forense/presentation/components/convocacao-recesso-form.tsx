"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, Pencil, Save, UserPlus } from "lucide-react";
import { SearchableSelect } from "@/components/ui";

import type { RecessoFormState } from "../../application/schemas/recesso-forense.schema";

type UnidadeOption = {
  id: string;
  sigla: string;
  nome: string;
};

type ServidorOption = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
};

type ConvocacaoRecessoFormProps = {
  recessoId: string;
  action: (
    state: RecessoFormState,
    formData: FormData,
  ) => Promise<RecessoFormState>;
  unidades: UnidadeOption[];
  servidores: ServidorOption[];
  convocacao?: {
    id: string;
    numeroPortaria: string;
    dataPortaria: Date | null;
    unidadeId: string | null;
    chefiaResponsavelId: string | null;
    descricao: string | null;
  };
};

const estadoInicial: RecessoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: RecessoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function ConvocacaoRecessoForm({
  recessoId,
  action,
  unidades,
  servidores,
  convocacao,
}: ConvocacaoRecessoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const editando = Boolean(convocacao);
  const numeroPortaria = String(
    estado.campos?.numeroPortaria ?? convocacao?.numeroPortaria ?? "",
  );
  const dataPortaria = String(
    estado.campos?.dataPortaria ??
      convocacao?.dataPortaria?.toISOString().slice(0, 10) ??
      "",
  );
  const unidadeId = String(
    estado.campos?.unidadeId ?? convocacao?.unidadeId ?? "",
  );
  const chefiaResponsavelId = String(
    estado.campos?.chefiaResponsavelId ??
      convocacao?.chefiaResponsavelId ??
      "",
  );
  const descricao = String(
    estado.campos?.descricao ?? convocacao?.descricao ?? "",
  );

  return (
    <form action={formAction} className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
      <input type="hidden" name="recessoId" value={recessoId} />
      {convocacao && (
        <input type="hidden" name="convocacaoId" value={convocacao.id} />
      )}

      <div className="flex items-center gap-2">
        {editando ? (
          <Pencil className="size-5 text-blue-900 dark:text-blue-300" />
        ) : (
          <UserPlus className="size-5 text-blue-900 dark:text-blue-300" />
        )}
        <h2 className="text-lg font-bold">
          {editando ? "Editar portaria de convocação" : "Portaria de convocação"}
        </h2>
      </div>

      {estado.mensagem && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {estado.mensagem}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="numeroPortaria" className="text-sm font-semibold">
            Número da portaria
          </label>
          <input
            id="numeroPortaria"
            name="numeroPortaria"
            defaultValue={numeroPortaria}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          />
          {erro(estado, "numeroPortaria") && (
            <p className="text-sm text-red-600">
              {erro(estado, "numeroPortaria")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataPortaria" className="text-sm font-semibold">
            Data da portaria
          </label>
          <input
            id="dataPortaria"
            name="dataPortaria"
            type="date"
            defaultValue={dataPortaria}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="unidadeId" className="text-sm font-semibold">
            Unidade
          </label>
          <SearchableSelect
            key={`unidade-${convocacao?.id ?? "nova"}-${unidadeId}`}
            id="unidadeId"
            name="unidadeId"
            defaultValue={unidadeId}
            placeholder="Todas / não informada"
            searchPlaceholder="Pesquisar por sigla ou nome..."
            emptyMessage="Nenhuma unidade encontrada."
            options={unidades.map((unidade) => ({
              value: unidade.id,
              label: `${unidade.sigla} - ${unidade.nome}`,
              searchText: `${unidade.sigla} ${unidade.nome}`,
            }))}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="chefiaResponsavelId" className="text-sm font-semibold">
            Chefia do recesso
          </label>
          <SearchableSelect
            key={`chefia-${convocacao?.id ?? "nova"}-${chefiaResponsavelId}`}
            id="chefiaResponsavelId"
            name="chefiaResponsavelId"
            defaultValue={chefiaResponsavelId}
            placeholder="Definir depois"
            searchPlaceholder="Pesquisar por matrícula ou nome..."
            options={servidores.map((servidor) => ({
              value: servidor.id,
              label: `${servidor.matricula} — ${servidor.usuario.nome}`,
            }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="descricao" className="text-sm font-semibold">
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
            defaultValue={descricao}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        {editando && (
          <Link
            href={`/recesso-forense/${recessoId}/convocacoes`}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            Cancelar edição
          </Link>
        )}
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editando ? "Atualizar portaria" : "Criar convocação"}
        </button>
      </div>
    </form>
  );
}
