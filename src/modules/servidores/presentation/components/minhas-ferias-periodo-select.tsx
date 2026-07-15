"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type PeriodoFeriasOption = {
  chave: string;
  exercicio: number | null;
  label: string;
  totalPeriodos: number;
  diasProgramados: number;
  status: "PROGRAMADA" | "EM_GOZO" | "ENCERRADA" | "INATIVA";
};

type MinhasFeriasPeriodoSelectProps = {
  periodos: PeriodoFeriasOption[];
  exercicioSelecionado: number | null;
};

function rotuloStatus(status: PeriodoFeriasOption["status"]) {
  if (status === "EM_GOZO") return "Em gozo";
  if (status === "PROGRAMADA") return "Programada";
  if (status === "INATIVA") return "Inativa";
  return "Encerrada";
}

function classeStatus(status: PeriodoFeriasOption["status"]) {
  if (status === "EM_GOZO") {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (status === "PROGRAMADA") {
    return "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  }

  if (status === "INATIVA") {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export function MinhasFeriasPeriodoSelect({
  periodos,
  exercicioSelecionado,
}: MinhasFeriasPeriodoSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const periodoSelecionado =
    periodos.find((periodo) => periodo.exercicio === exercicioSelecionado) ??
    periodos[0] ??
    null;

  function selecionarPeriodo(valor: string) {
    startTransition(() => {
      router.push(
        valor
          ? `/minhas-ferias?${new URLSearchParams({
              exercicio: valor,
            }).toString()}`
          : "/minhas-ferias",
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(16rem,26rem)_1fr] md:items-end">
        <div className="space-y-2">
          <label htmlFor="exercicio" className="text-sm font-semibold">
            Período aquisitivo
          </label>
          <div className="relative">
            <select
              id="exercicio"
              name="exercicio"
              value={exercicioSelecionado ? String(exercicioSelecionado) : ""}
              onChange={(event) => selecionarPeriodo(event.target.value)}
              disabled={isPending}
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-wait disabled:opacity-80"
            >
              {periodos.map((periodo) => (
                <option key={periodo.chave} value={periodo.exercicio ?? ""}>
                  {periodo.label} - {rotuloStatus(periodo.status)}
                </option>
              ))}
            </select>
            <div
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-1 h-0.5 overflow-hidden rounded-full bg-[var(--muted)] transition-opacity ${
                isPending ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="h-full w-1/2 animate-[secp-ferias-progress_1s_ease-in-out_infinite] rounded-full bg-blue-900" />
            </div>
          </div>
        </div>

        {periodoSelecionado ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(
                periodoSelecionado.status,
              )}`}
            >
              {rotuloStatus(periodoSelecionado.status)}
            </span>
            <span>
              {periodoSelecionado.totalPeriodos} período
              {periodoSelecionado.totalPeriodos === 1 ? "" : "s"}
            </span>
            <span aria-hidden="true">|</span>
            <span>{periodoSelecionado.diasProgramados} dia(s)</span>
            {isPending ? (
              <>
                <span aria-hidden="true">|</span>
                <span>Atualizando</span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <style jsx>{`
        @keyframes secp-ferias-progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(80%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  );
}
