"use client";

import { useActionState } from "react";
import { Ban, Loader2, Plus, XCircle } from "lucide-react";
import type {
  DispensaPontoServidorFormState,
  EncerrarDispensaPontoServidorFormState,
} from "../../application/schemas/dispensa-ponto-servidor.schema";

type DispensaPontoItem = {
  id: string;
  motivo: string;
  atoAutorizativo: string | null;
  processoSei: string | null;
  observacao: string | null;
  exigeFrequenciaManual: boolean;
  status: string;
  dataInicio: string;
  dataFim: string | null;
  encerrarAction: (
    state: EncerrarDispensaPontoServidorFormState,
    formData: FormData,
  ) => Promise<EncerrarDispensaPontoServidorFormState>;
};

type DispensaPontoServidorCardProps = {
  dispensas: DispensaPontoItem[];
  fusoHorario: string;
  action: (
    state: DispensaPontoServidorFormState,
    formData: FormData,
  ) => Promise<DispensaPontoServidorFormState>;
};

const estadoInicial: DispensaPontoServidorFormState = {
  sucesso: false,
  mensagem: null,
};

const estadoEncerramentoInicial: EncerrarDispensaPontoServidorFormState = {
  sucesso: false,
  mensagem: null,
};

function formatarData(data: string | null) {
  if (!data) {
    return "Atual";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(data));
}

function dataHojeFormulario(fusoHorario: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
  }).format(new Date());
}

function erro(
  erros: Record<string, string[]> | undefined,
  campo: string,
) {
  return erros?.[campo]?.[0];
}

function EncerrarDispensaForm({
  action,
  fusoHorario,
}: {
  action: DispensaPontoItem["encerrarAction"];
  fusoHorario: string;
}) {
  const [estado, formAction, pendente] = useActionState(
    action,
    estadoEncerramentoInicial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="date"
        name="dataFim"
        defaultValue={estado.campos?.dataFim ?? dataHojeFormulario(fusoHorario)}
        className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        aria-label="Data de encerramento"
        required
      />

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pendente ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <XCircle className="size-4" aria-hidden="true" />
        )}
        Encerrar
      </button>

      {estado.mensagem && (
        <p
          className={`text-xs ${
            estado.sucesso ? "text-green-700" : "text-red-600"
          }`}
        >
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}

export function DispensaPontoServidorCard({
  dispensas,
  fusoHorario,
  action,
}: DispensaPontoServidorCardProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Ban className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Dispensa administrativa de ponto</h2>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {dispensas.map((dispensa) => (
            <div key={dispensa.id} className="rounded-lg border p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-semibold">{dispensa.motivo}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {formatarData(dispensa.dataInicio)} ate{" "}
                    {formatarData(dispensa.dataFim)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                    dispensa.status === "ATIVO"
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {dispensa.status === "ATIVO" ? "Ativa" : "Encerrada"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
                <p>
                  Ato:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {dispensa.atoAutorizativo ?? "-"}
                  </span>
                </p>
                <p>
                  SEI:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {dispensa.processoSei ?? "-"}
                  </span>
                </p>
                <p>
                  Frequência manual:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {dispensa.exigeFrequenciaManual ? "Obrigatória" : "Não"}
                  </span>
                </p>
              </div>

              {dispensa.observacao && (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {dispensa.observacao}
                </p>
              )}

              {dispensa.status === "ATIVO" && (
                <div className="mt-4">
              <EncerrarDispensaForm
                action={dispensa.encerrarAction}
                fusoHorario={fusoHorario}
              />
                </div>
              )}
            </div>
          ))}

          {dispensas.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma dispensa administrativa registrada para este servidor.
            </div>
          )}
        </div>

        <form action={formAction} className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="text-base font-bold">Nova dispensa</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Use para autorizar dispensa do registro eletronico por periodo.
            </p>
          </div>

          {estado.mensagem && (
            <div
              role="alert"
              className={`rounded-lg border p-3 text-sm ${
                estado.sucesso
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {estado.mensagem}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="motivoDispensaPonto" className="text-sm font-semibold">
              Motivo
            </label>
            <input
              id="motivoDispensaPonto"
              name="motivo"
              defaultValue={estado.campos?.motivo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            />
            {erro(estado.erros, "motivo") && (
              <p className="text-sm text-red-600">
                {erro(estado.erros, "motivo")}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dataInicioDispensaPonto" className="text-sm font-semibold">
                Início
              </label>
              <input
                id="dataInicioDispensaPonto"
                name="dataInicio"
                type="date"
                defaultValue={
                  estado.campos?.dataInicio ?? dataHojeFormulario(fusoHorario)
                }
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                required
              />
              {erro(estado.erros, "dataInicio") && (
                <p className="text-sm text-red-600">
                  {erro(estado.erros, "dataInicio")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="dataFimDispensaPonto" className="text-sm font-semibold">
                Fim
              </label>
              <input
                id="dataFimDispensaPonto"
                name="dataFim"
                type="date"
                defaultValue={estado.campos?.dataFim ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              />
              {erro(estado.erros, "dataFim") && (
                <p className="text-sm text-red-600">
                  {erro(estado.erros, "dataFim")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="atoAutorizativoDispensaPonto" className="text-sm font-semibold">
                Ato autorizativo
              </label>
              <input
                id="atoAutorizativoDispensaPonto"
                name="atoAutorizativo"
                defaultValue={estado.campos?.atoAutorizativo ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="processoSeiDispensaPonto" className="text-sm font-semibold">
                Processo SEI
              </label>
              <input
                id="processoSeiDispensaPonto"
                name="processoSei"
                defaultValue={estado.campos?.processoSei ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              />
            </div>
          </div>

          <input type="hidden" name="exigeFrequenciaManual" value="false" />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="exigeFrequenciaManual"
              value="true"
              defaultChecked={estado.campos?.exigeFrequenciaManual ?? true}
              className="size-4 accent-blue-900"
            />
            Exigir frequencia manual
          </label>

          <div className="space-y-2">
            <label htmlFor="observacaoDispensaPonto" className="text-sm font-semibold">
              Observacao
            </label>
            <textarea
              id="observacaoDispensaPonto"
              name="observacao"
              defaultValue={estado.campos?.observacao ?? ""}
              rows={3}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pendente}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pendente ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Registrar dispensa
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
