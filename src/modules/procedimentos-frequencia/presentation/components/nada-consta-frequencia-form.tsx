"use client";

import { useActionState } from "react";
import { CheckCircle2, FileCheck2, Search } from "lucide-react";

import { SearchableSelect } from "@/components/ui";

import type {
  NadaConstaFrequenciaFormState,
  NadaConstaFrequenciaResumo,
} from "../../application/actions/emitir-nada-consta-frequencia.action";
import { NadaConstaPdfButton } from "./nada-consta-pdf-button";

type ServidorOption = {
  id: string;
  nome: string;
  matricula: string;
  orgaoSigla: string;
  unidadeSigla?: string | null;
};

type NadaConstaFrequenciaFormProps = {
  servidores: ServidorOption[];
  action: (
    state: NadaConstaFrequenciaFormState,
    formData: FormData,
  ) => Promise<NadaConstaFrequenciaFormState>;
};

const estadoInicial: NadaConstaFrequenciaFormState = {
  sucesso: false,
};

function erro(
  estado: NadaConstaFrequenciaFormState,
  campo: keyof NonNullable<NadaConstaFrequenciaFormState["erros"]>,
) {
  return estado.erros?.[campo]?.[0];
}

function minutosParaHora(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, "0")}:${String(
    absoluto % 60,
  ).padStart(2, "0")}`;
}

function ResultadoCard({ resumo }: { resumo: NadaConstaFrequenciaResumo }) {
  const semPendencias = resumo.resultado === "NADA_CONSTA";

  return (
    <section className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${
            semPendencias
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          <FileCheck2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Resultado consolidado
          </p>
          <h2 className="text-lg font-black">
            {semPendencias ? "Nada consta" : "Constam pendências"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {resumo.mensagem}
          </p>
        </div>
        <NadaConstaPdfButton resumo={resumo} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            Saldo
          </p>
          <p className="mt-1 font-black">
            {minutosParaHora(resumo.saldoBancoHorasMinutos)}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            Débitos vencidos
          </p>
          <p className="mt-1 font-black">
            {minutosParaHora(resumo.debitosVencidosMinutos)}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            Faltas
          </p>
          <p className="mt-1 font-black">{resumo.faltasNaoResolvidas}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            Homologações
          </p>
          <p className="mt-1 font-black">{resumo.pendenciasHomologacao}</p>
        </div>
      </div>
    </section>
  );
}

export function NadaConstaFrequenciaForm({
  servidores,
  action,
}: NadaConstaFrequenciaFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <form
        action={formAction}
        className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <Search className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black">Emitir Nada Consta</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Consolide saldo, débitos vencidos, faltas e homologações pendentes
              do servidor selecionado.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold">
            Servidor
            <SearchableSelect
              id="nada-consta-servidor"
              name="servidorId"
              defaultValue={estado.campos?.servidorId ?? ""}
              placeholder="Selecione o servidor"
              searchPlaceholder="Pesquisar por matrícula, nome, órgão ou unidade..."
              emptyMessage="Nenhum servidor encontrado."
              options={servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} - ${servidor.nome} (${servidor.orgaoSigla}${servidor.unidadeSigla ? ` / ${servidor.unidadeSigla}` : ""})`,
                searchText: `${servidor.matricula} ${servidor.nome} ${servidor.orgaoSigla} ${servidor.unidadeSigla ?? ""}`,
              }))}
            />
            {erro(estado, "servidorId") ? (
              <span className="text-xs text-red-600">{erro(estado, "servidorId")}</span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold">
            Processo SEI
            <input
              name="processoSei"
              defaultValue={estado.campos?.processoSei ?? ""}
              className="h-11 rounded-md border bg-[var(--background)] px-3 text-sm"
              placeholder="Ex.: 0000000-00.2026.4.01.8000"
            />
            {erro(estado, "processoSei") ? (
              <span className="text-xs text-red-600">{erro(estado, "processoSei")}</span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-semibold">
            Justificativa administrativa
            <textarea
              name="justificativa"
              defaultValue={estado.campos?.justificativa ?? ""}
              rows={4}
              className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Informe o motivo da emissão e o destino do documento."
            />
            {erro(estado, "justificativa") ? (
              <span className="text-xs text-red-600">{erro(estado, "justificativa")}</span>
            ) : null}
          </label>
        </div>

        {estado.mensagem ? (
          <p
            className={`mt-4 rounded-md border px-3 py-2 text-sm ${
              estado.sucesso
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {estado.mensagem}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {pendente ? "Emitindo..." : "Emitir Nada Consta"}
          </button>
        </div>
      </form>

      {estado.resumo ? (
        <ResultadoCard resumo={estado.resumo} />
      ) : (
        <aside className="rounded-lg border bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
          O resultado aparecerá aqui e ficará registrado em Procedimentos de
          frequência como execução do motor.
        </aside>
      )}
    </div>
  );
}
