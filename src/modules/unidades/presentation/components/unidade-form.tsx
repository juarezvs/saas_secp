"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
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
  fusosHorarios?: {
    valor: string;
    rotulo: string;
  }[];
  valoresIniciais?: {
    orgaoId?: string;
    unidadePaiId?: string | null;
    codigo?: string;
    sigla?: string;
    nome?: string;
    tipo?: string;
    fusoHorario?: string | null;
    uf?: string | null;
    municipio?: string | null;
    municipioIbge?: string | null;
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
  fusosHorarios = [],
  valoresIniciais,
  unidadeAtualId,
  modo,
}: UnidadeFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = estado.campos ?? valoresIniciais;
  const opcoesFuso =
    fusosHorarios.length > 0
      ? fusosHorarios
      : [{ valor: "America/Manaus", rotulo: "Manaus (UTC-04)" }];

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
            <label htmlFor="unidadePaiId" className="text-sm font-semibold">
              Unidade superior
            </label>

            <SearchableSelect
              id="unidadePaiId"
              name="unidadePaiId"
              defaultValue={campos?.unidadePaiId ?? ""}
              placeholder="Sem unidade superior"
              searchPlaceholder="Pesquisar unidade superior..."
              emptyMessage="Nenhuma unidade encontrada."
              options={unidadesDisponiveis.map((unidade) => ({
                value: unidade.id,
                label: `${unidade.sigla} - ${unidade.nome}`,
                searchText: `${unidade.sigla} ${unidade.nome} ${unidade.codigo} ${unidade.tipo}`,
              }))}
            />

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

            <SearchableSelect
              id="tipo"
              name="tipo"
              defaultValue={campos?.tipo ?? ""}
              placeholder="Selecione o tipo"
              searchPlaceholder="Pesquisar tipo..."
              emptyMessage="Nenhum tipo encontrado."
              options={tiposUnidadeOrganizacional.map((tipo) => ({
                value: tipo,
                label: rotulosTipoUnidade[tipo] ?? tipo,
                searchText: tipo,
              }))}
              required
            />

            {obterErro(estado.erros, "tipo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "tipo")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="fusoHorario" className="text-sm font-semibold">
              Fuso horário
            </label>

            <SearchableSelect
              id="fusoHorario"
              name="fusoHorario"
              defaultValue={campos?.fusoHorario ?? ""}
              placeholder="Herdar da unidade superior ou órgão"
              searchPlaceholder="Pesquisar fuso horário..."
              emptyMessage="Nenhum fuso horário encontrado."
              options={opcoesFuso.map((fuso) => ({
                value: fuso.valor,
                label: fuso.rotulo,
                searchText: fuso.valor,
              }))}
            />

            {obterErro(estado.erros, "fusoHorario") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "fusoHorario")}
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Localidade</h3>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Informe a sede da unidade. Se ficar em branco, o calendario usa
                a localidade da unidade superior.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[120px_1fr_180px]">
              <div className="space-y-2">
                <label htmlFor="uf" className="text-sm font-semibold">
                  UF
                </label>
                <input
                  id="uf"
                  name="uf"
                  maxLength={2}
                  defaultValue={campos?.uf ?? ""}
                  placeholder="AM"
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                {obterErro(estado.erros, "uf") && (
                  <p className="text-sm text-red-600">
                    {obterErro(estado.erros, "uf")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="municipio" className="text-sm font-semibold">
                  Municipio
                </label>
                <input
                  id="municipio"
                  name="municipio"
                  defaultValue={campos?.municipio ?? ""}
                  placeholder="Ex.: Tabatinga"
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                {obterErro(estado.erros, "municipio") && (
                  <p className="text-sm text-red-600">
                    {obterErro(estado.erros, "municipio")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="municipioIbge" className="text-sm font-semibold">
                  Código IBGE
                </label>
                <input
                  id="municipioIbge"
                  name="municipioIbge"
                  inputMode="numeric"
                  maxLength={7}
                  defaultValue={campos?.municipioIbge ?? ""}
                  placeholder="1304062"
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                {obterErro(estado.erros, "municipioIbge") && (
                  <p className="text-sm text-red-600">
                    {obterErro(estado.erros, "municipioIbge")}
                  </p>
                )}
              </div>
            </div>
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


