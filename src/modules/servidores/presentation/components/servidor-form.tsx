"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
import {
  tiposVinculoServidor,
  type ServidorFormState,
} from "../../application/schemas/servidor.schema";
import { IdentificadoresPontoField } from "./identificadores-ponto-field";

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
  categorias: Array<{
    id: string;
    codigo: string;
    nome: string;
  }>;
  valoresIniciais?: {
    orgaoId?: string;
    categoriaPessoaId?: string | null;
    matricula?: string;
    cpf: string;
    pis?: string | null;
    nome?: string;
    email?: string | null;
    nomeFuncional?: string | null;
    tipoUsuario?: string;
    vinculo?: string;
    cargoDescricao?: string | null;
    funcaoDescricao?: string | null;
    descricaoProvimentoSarh?: string | null;
    descricaoSituacaoSarh?: string | null;
    sinalizacaoForaExpediente?: string | null;
    ativo?: boolean;
    identificadoresPonto?: string[];
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
  categorias,
  valoresIniciais,
  modo,
}: ServidorFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = {
    ...valoresIniciais,
    ...estado.campos,
  };

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="tipoUsuario"
        value={campos.tipoUsuario ?? "SERVIDOR"}
      />

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

            <SearchableSelect
              id="orgaoId"
              name="orgaoId"
              defaultValue={campos?.orgaoId ?? ""}
              placeholder="Selecione o órgão"
              searchPlaceholder="Pesquisar órgão..."
              emptyMessage="Nenhum órgão encontrado."
              options={orgaos.map((orgao) => ({
                value: orgao.id,
                label: `${orgao.sigla} - ${orgao.nome}`,
                searchText: `${orgao.sigla} ${orgao.nome}`,
              }))}
              required
            />

            {obterErro(estado.erros, "orgaoId") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "orgaoId")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="categoriaPessoaId"
              className="text-sm font-semibold"
            >
              Categoria
            </label>

            <SearchableSelect
              id="categoriaPessoaId"
              name="categoriaPessoaId"
              defaultValue={campos?.categoriaPessoaId ?? ""}
              placeholder="Selecione a categoria"
              searchPlaceholder="Pesquisar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
              options={categorias.map((categoria) => ({
                value: categoria.id,
                label: categoria.nome,
                searchText: categoria.codigo,
              }))}
              required
            />

            {obterErro(estado.erros, "categoriaPessoaId") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "categoriaPessoaId")}
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
              required
            />

            {obterErro(estado.erros, "cpf") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "cpf")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="pis" className="text-sm font-semibold">
              PIS/PASEP
            </label>

            <input
              id="pis"
              name="pis"
              defaultValue={campos?.pis ?? ""}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.00000.00-0"
              className="h-10 w-full rounded-md border bg-(--card) px-3 text-sm"
            />

            {obterErro(estado.erros, "pis") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "pis")}
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
              É-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              defaultValue={campos?.email ?? ""}
              placeholder="nome@trf1.jus.br"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
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

            <SearchableSelect
              id="vinculo"
              name="vinculo"
              defaultValue={campos?.vinculo ?? "EFETIVO"}
              placeholder="Selecione o vínculo"
              searchPlaceholder="Pesquisar vínculo..."
              emptyMessage="Nenhum vínculo encontrado."
              options={tiposVinculoServidor.map((tipo) => ({
                value: tipo,
                label: rotulosVinculo[tipo] ?? tipo,
                searchText: tipo,
              }))}
              required
            />

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

          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="sinalizacaoForaExpediente"
              className="text-sm font-semibold"
            >
              Marcação fora do expediente
            </label>

            <SearchableSelect
              id="sinalizacaoForaExpediente"
              name="sinalizacaoForaExpediente"
              defaultValue={campos?.sinalizacaoForaExpediente ?? "PADRAO"}
              placeholder="Selecione a regra de sinalização"
              searchPlaceholder="Pesquisar regra..."
              emptyMessage="Nenhuma regra encontrada."
              options={[
                { value: "PADRAO", label: "Seguir padrão do órgão" },
                { value: "NAO_SINALIZAR", label: "Não sinalizar" },
                { value: "SINALIZAR", label: "Sinalizar como inconsistência" },
              ]}
            />

            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              Use a opção individual apenas para casos excepcionais; o padrão do
              SECP é não sinalizar marcações fora do expediente.
            </p>

            {obterErro(estado.erros, "sinalizacaoForaExpediente") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "sinalizacaoForaExpediente")}
              </p>
            )}
          </div>

          <IdentificadoresPontoField
            matricula={campos?.matricula}
            valorInicial={campos?.identificadoresPonto}
            erro={obterErro(estado.erros, "identificadoresPonto")}
          />
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

          {modo === "criar" ? "Criar pessoa" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
