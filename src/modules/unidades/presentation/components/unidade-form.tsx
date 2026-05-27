"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  tiposUnidadeOrganizacional,
  type UnidadeFormState,
} from "../../application/schemas/unidade.schema";

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type UnidadeSelecaoItem = {
  id: string;
  orgaoId: string;
  codigo: string;
  sigla: string;
  nome: string;
  tipo: string;
  unidadePaiId: string | null;
};

type UnidadeFormProps = {
  action: (
    state: UnidadeFormState,
    formData: FormData
  ) => Promise<UnidadeFormState>;
  orgaos: OrgaoItem[];
  unidades: UnidadeSelecaoItem[];
  valoresIniciais?: {
    orgaoId?: string;
    unidadePaiId?: string | null;
    codigo?: string;
    sigla?: string;
    nome?: string;
    tipo?: string;
    ativo?: boolean;
  };
  unidadeAtualId?: string;
  modo: "criar" | "editar";
};

const estadoInicial: UnidadeFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipoUnidade: Record<string, string> = {
  ORGAO: "Órgão",
  SECAO_JUDICIARIA: "Seção Judiciária",
  SUBSECAO_JUDICIARIA: "Subseção Judiciária",
  UNIDADE_AVANCADA_ATENDIMENTO: "Unidade Avançada de Atendimento",
  NUCLEO: "Núcleo",
  SECAO: "Seção",
  SECRETARIA: "Secretaria",
  VARA: "Vara",
  GABINETE: "Gabinete",
  TURMA_RECURSAL: "Turma Recursal",
  CENTRO_CONCILIACAO: "Centro de Conciliação",
  DEPARTAMENTO: "Departamento",
  SUBDEPARTAMENTO: "Subdepartamento",
  OUTRA: "Outra",
};

function obterErro(
  erros: Record<string, string[]> | undefined,
  campo: string
) {
  return erros?.[campo]?.[0];
}

export function UnidadeForm({
  action,
  orgaos,
  unidades,
  valoresIniciais,
  unidadeAtualId,
  modo,
}: UnidadeFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = estado.campos ?? valoresIniciais;

  const unidadesDisponiveis = unidades.filter(
    (unidade) => unidade.id !== unidadeAtualId
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
        <h2 className="text-lg font-bold">Dados da unidade</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="orgaoId" className="text-sm font-semibold">
              Órgão
            </label>

            <select
              id="orgaoId"
              name="orgaoId"
              defaultValue={campos?.orgaoId ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
            <label htmlFor="unidadePaiId" className="text-sm font-semibold">
              Unidade superior
            </label>

            <select
              id="unidadePaiId"
              name="unidadePaiId"
              defaultValue={campos?.unidadePaiId ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="">Sem unidade superior</option>

              {unidadesDisponiveis.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.sigla} — {unidade.nome}
                </option>
              ))}
            </select>

            {obterErro(estado.erros, "unidadePaiId") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "unidadePaiId")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Código
            </label>

            <input
              id="codigo"
              name="codigo"
              type="text"
              defaultValue={campos?.codigo ?? ""}
              placeholder="Ex.: NUTEC"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "codigo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "codigo")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="sigla" className="text-sm font-semibold">
              Sigla
            </label>

            <input
              id="sigla"
              name="sigla"
              type="text"
              defaultValue={campos?.sigla ?? ""}
              placeholder="Ex.: NUTEC"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "sigla") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "sigla")}
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
              placeholder="Ex.: Núcleo de Tecnologia da Informação"
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
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>

            <select
              id="tipo"
              name="tipo"
              defaultValue={campos?.tipo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              <option value="">Selecione</option>

              {tiposUnidadeOrganizacional.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipoUnidade[tipo] ?? tipo}
                </option>
              ))}
            </select>

            {obterErro(estado.erros, "tipo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "tipo")}
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
              <span className="block font-semibold">Unidade ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Unidades inativas não devem ser usadas em novas lotações.
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

          {modo === "criar" ? "Criar unidade" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}