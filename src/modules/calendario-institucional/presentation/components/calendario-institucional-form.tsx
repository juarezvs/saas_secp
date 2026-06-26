"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
import {
  abrangenciasCalendarioInstitucional,
  tiposCalendarioInstitucional,
  type CalendarioInstitucionalFormState,
} from "../../application/schemas/calendario-institucional.schema";

type CalendarioInstitucionalFormProps = {
  action: (
    state: CalendarioInstitucionalFormState,
    formData: FormData,
  ) => Promise<CalendarioInstitucionalFormState>;
  valoresIniciais?: {
    dataReferencia?: string;
    descricao?: string;
    tipo?: string;
    abrangencia?: string;
    uf?: string | null;
    municipio?: string | null;
    municipioIbge?: string | null;
    orgaoId?: string | null;
    unidadeId?: string | null;
    contaComoDiaUtil?: boolean;
    geraApuracaoRegular?: boolean;
    janelaInicio?: string | null;
    janelaFim?: string | null;
    dataOriginal?: string | null;
    dataSubstituida?: boolean;
    observacao?: string | null;
    ativo?: boolean;
  };
  orgaos?: Array<{ id: string; sigla: string; nome: string }>;
  unidades?: Array<{ id: string; sigla: string; nome: string }>;
  modo: "criar" | "editar";
};

const estadoInicial: CalendarioInstitucionalFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipo: Record<string, string> = {
  FERIADO: "Feriado",
  PONTO_FACULTATIVO: "Ponto facultativo",
  SUSPENSAO_EXPEDIENTE: "Suspensao do expediente",
};

const rotulosAbrangencia: Record<string, string> = {
  NACIONAL: "Nacional",
  ESTADUAL: "Estadual",
  MUNICIPAL: "Municipal",
  ORGAO: "Orgao",
  UNIDADE: "Unidade",
};

function erro(estado: CalendarioInstitucionalFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function CalendarioInstitucionalForm({
  action,
  valoresIniciais,
  orgaos = [],
  unidades = [],
  modo,
}: CalendarioInstitucionalFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;
  const [abrangencia, setAbrangencia] = useState(
    campos?.abrangencia ?? "NACIONAL",
  );
  const [uf, setUf] = useState(campos?.uf ?? "");
  const [municipio, setMunicipio] = useState(campos?.municipio ?? "");
  const [municipioIbge, setMunicipioIbge] = useState(
    campos?.municipioIbge ?? "",
  );
  const ufDesabilitada =
    abrangencia !== "ESTADUAL" && abrangencia !== "MUNICIPAL";
  const municipioDesabilitado = abrangencia !== "MUNICIPAL";

  function alterarAbrangencia(novaAbrangencia: string) {
    setAbrangencia(novaAbrangencia);

    if (novaAbrangencia !== "ESTADUAL" && novaAbrangencia !== "MUNICIPAL") {
      setUf("");
      setMunicipio("");
      setMunicipioIbge("");
      return;
    }

    if (novaAbrangencia === "ESTADUAL") {
      setMunicipio("");
      setMunicipioIbge("");
    }
  }

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
        <h2 className="text-lg font-bold">
          {modo === "criar"
            ? "Novo evento institucional"
            : "Editar evento institucional"}
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="dataReferencia" className="text-sm font-semibold">
              Data de efeito
            </label>
            <input
              id="dataReferencia"
              name="dataReferencia"
              type="date"
              defaultValue={campos?.dataReferencia ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "dataReferencia") && (
              <p className="text-sm text-red-600">
                {erro(estado, "dataReferencia")}
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
              defaultValue={campos?.tipo ?? "FERIADO"}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposCalendarioInstitucional.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipo[tipo] ?? tipo}
                </option>
              ))}
            </select>
            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Descricao
            </label>
            <input
              id="descricao"
              name="descricao"
              defaultValue={campos?.descricao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="Ex.: Quarta-feira de cinzas"
              required
            />
            {erro(estado, "descricao") && (
              <p className="text-sm text-red-600">{erro(estado, "descricao")}</p>
            )}
          </div>

          <div className="rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Abrangencia</h3>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Define quais servidores serao impactados no espelho de ponto e
                no banco de horas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="abrangencia" className="text-sm font-semibold">
                  Aplicacao
                </label>
                <select
                  id="abrangencia"
                  name="abrangencia"
                  value={abrangencia}
                  onChange={(event) => alterarAbrangencia(event.target.value)}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                  required
                >
                  {abrangenciasCalendarioInstitucional.map((abrangencia) => (
                    <option key={abrangencia} value={abrangencia}>
                      {rotulosAbrangencia[abrangencia] ?? abrangencia}
                    </option>
                  ))}
                </select>
                {erro(estado, "abrangencia") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "abrangencia")}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
                <div className="space-y-2">
                  <label htmlFor="uf" className="text-sm font-semibold">
                    UF
                  </label>
                  <input
                    id="uf"
                    name="uf"
                    maxLength={2}
                    value={uf}
                    onChange={(event) =>
                      setUf(event.target.value.toUpperCase())
                    }
                    disabled={ufDesabilitada}
                    required={
                      abrangencia === "ESTADUAL" ||
                      abrangencia === "MUNICIPAL"
                    }
                    placeholder="AM"
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {erro(estado, "uf") && (
                    <p className="text-sm text-red-600">{erro(estado, "uf")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="municipio" className="text-sm font-semibold">
                    Municipio
                  </label>
                  <input
                    id="municipio"
                    name="municipio"
                    value={municipio}
                    onChange={(event) => setMunicipio(event.target.value)}
                    disabled={municipioDesabilitado}
                    required={abrangencia === "MUNICIPAL"}
                    placeholder="Ex.: Tabatinga"
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {erro(estado, "municipio") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "municipio")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="municipioIbge" className="text-sm font-semibold">
                  Codigo IBGE do municipio
                </label>
                <input
                  id="municipioIbge"
                  name="municipioIbge"
                  inputMode="numeric"
                  maxLength={7}
                  value={municipioIbge}
                  onChange={(event) => setMunicipioIbge(event.target.value)}
                  disabled={municipioDesabilitado}
                  placeholder="1304062"
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {erro(estado, "municipioIbge") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "municipioIbge")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="orgaoId" className="text-sm font-semibold">
                  Orgao
                </label>
                <SearchableSelect
                  id="orgaoId"
                  name="orgaoId"
                  defaultValue={campos?.orgaoId ?? ""}
                  placeholder="Nao se aplica"
                  searchPlaceholder="Pesquisar por sigla ou nome..."
                  emptyMessage="Nenhum orgao encontrado."
                  options={[
                    { value: "", label: "Nao se aplica" },
                    ...orgaos.map((orgao) => ({
                      value: orgao.id,
                      label: `${orgao.sigla} - ${orgao.nome}`,
                      searchText: `${orgao.sigla} ${orgao.nome}`,
                    })),
                  ]}
                />
                {erro(estado, "orgaoId") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "orgaoId")}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="unidadeId" className="text-sm font-semibold">
                  Unidade
                </label>
                <SearchableSelect
                  id="unidadeId"
                  name="unidadeId"
                  defaultValue={campos?.unidadeId ?? ""}
                  placeholder="Nao se aplica"
                  searchPlaceholder="Pesquisar por sigla ou nome..."
                  emptyMessage="Nenhuma unidade encontrada."
                  options={[
                    { value: "", label: "Nao se aplica" },
                    ...unidades.map((unidade) => ({
                      value: unidade.id,
                      label: `${unidade.sigla} - ${unidade.nome}`,
                      searchText: `${unidade.sigla} ${unidade.nome}`,
                    })),
                  ]}
                />
                {erro(estado, "unidadeId") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "unidadeId")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="contaComoDiaUtil"
              defaultChecked={campos?.contaComoDiaUtil ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Conta como dia util</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Afeta os prazos regulatorios de homologacao e boletim.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="geraApuracaoRegular"
              defaultChecked={campos?.geraApuracaoRegular ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Gera apuracao regular</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Mantem apuracao ordinaria no dia cadastrado.
              </span>
            </span>
          </label>
          {erro(estado, "geraApuracaoRegular") && (
            <p className="text-sm text-red-600 md:col-span-2">
              {erro(estado, "geraApuracaoRegular")}
            </p>
          )}

          <div className="rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">
                Janela especial de expediente
              </h3>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Use para expediente parcial, como dias em que o expediente
                comeca apenas no meio do dia.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="janelaInicio" className="text-sm font-semibold">
                  Inicio
                </label>
                <input
                  id="janelaInicio"
                  name="janelaInicio"
                  type="time"
                  defaultValue={campos?.janelaInicio ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                {erro(estado, "janelaInicio") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "janelaInicio")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="janelaFim" className="text-sm font-semibold">
                  Fim
                </label>
                <input
                  id="janelaFim"
                  name="janelaFim"
                  type="time"
                  defaultValue={campos?.janelaFim ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                {erro(estado, "janelaFim") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "janelaFim")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="dataSubstituida"
                defaultChecked={campos?.dataSubstituida ?? false}
                className="size-4 rounded border-slate-300"
              />
              <span>
                <span className="block font-semibold">
                  Evento transferido de outra data
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Registra a data original para auditoria e replicacao anual.
                </span>
              </span>
            </label>

            <div className="mt-4 space-y-2">
              <label htmlFor="dataOriginal" className="text-sm font-semibold">
                Data original
              </label>
              <input
                id="dataOriginal"
                name="dataOriginal"
                type="date"
                defaultValue={campos?.dataOriginal ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
              {erro(estado, "dataOriginal") && (
                <p className="text-sm text-red-600">
                  {erro(estado, "dataOriginal")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="observacao" className="text-sm font-semibold">
              Observacao
            </label>
            <textarea
              id="observacao"
              name="observacao"
              defaultValue={campos?.observacao ?? ""}
              rows={4}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="Base normativa, ato administrativo ou observacoes operacionais."
            />
            {erro(estado, "observacao") && (
              <p className="text-sm text-red-600">{erro(estado, "observacao")}</p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Evento ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Eventos inativos permanecem no historico, mas deixam de produzir
                efeito.
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
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {modo === "criar" ? "Criar evento" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
