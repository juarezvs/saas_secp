"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import {
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
    contaComoDiaUtil?: boolean;
    geraApuracaoRegular?: boolean;
    janelaInicio?: string | null;
    janelaFim?: string | null;
    dataOriginal?: string | null;
    dataSubstituida?: boolean;
    observacao?: string | null;
    ativo?: boolean;
  };
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

function erro(estado: CalendarioInstitucionalFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function CalendarioInstitucionalForm({
  action,
  valoresIniciais,
  modo,
}: CalendarioInstitucionalFormProps) {
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
