"use client";

import { useEffect, useRef, useState } from "react";

type Progresso = {
  percentual: number;
  etapa: string;
  processadas: number;
  pendentesAnalisadas: number;
  competenciasRecalculadas: number;
  totalCompetencias: number;
  erros: number;
};

type EstadoJob = "idle" | "waiting" | "active" | "completed" | "failed";

type Resultado = {
  pendentesRestantes: number;
  semServidorCorrespondente: number;
  periodosHomologados: number;
};

export function ReprocessarTodosForm() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoJob>("idle");
  const [progresso, setProgresso] = useState<Progresso>({
    percentual: 0,
    etapa: "Aguardando reprocessamento global",
    processadas: 0,
    pendentesAnalisadas: 0,
    competenciasRecalculadas: 0,
    totalCompetencias: 0,
    erros: 0,
  });
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId || estado === "completed" || estado === "failed") return;

    async function consultar() {
      const response = await fetch(
        `/api/marcacoes-brutas/reprocessar-todos?jobId=${encodeURIComponent(jobId!)}`,
        { cache: "no-store" },
      );
      const dados = await response.json();

      if (!response.ok) {
        setEstado("failed");
        setMensagemErro(dados.mensagem ?? "Falha ao consultar processamento.");
        return;
      }

      setEstado(dados.estado);
      if (typeof dados.progresso === "object") {
        setProgresso(dados.progresso);
      }
      if (dados.estado === "failed") {
        setMensagemErro(dados.erro ?? "O processamento global falhou.");
      }
      if (dados.estado === "completed" && dados.resultado) {
        setResultado(dados.resultado);
      }
    }

    void consultar();
    intervalRef.current = setInterval(() => void consultar(), 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [estado, jobId]);

  async function iniciar() {
    setMensagemErro(null);
    setResultado(null);
    setEstado("waiting");
    setProgresso((atual) => ({
      ...atual,
      percentual: 1,
      etapa: "Enfileirando reprocessamento global",
    }));

    const response = await fetch("/api/marcacoes-brutas/reprocessar-todos", {
      method: "POST",
    });
    const dados = await response.json();

    if (!response.ok) {
      setEstado("failed");
      setMensagemErro(dados.mensagem ?? "Falha ao iniciar processamento.");
      return;
    }

    setJobId(String(dados.jobId));
    setEstado(dados.estado);
    if (typeof dados.progresso === "object") {
      setProgresso(dados.progresso);
    }
  }

  const executando = estado === "waiting" || estado === "active";
  const concluido = estado === "completed";

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
      <button
        type="button"
        disabled={executando}
        onClick={iniciar}
        className="shrink-0 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {executando ? "Reprocessando todos..." : "Reprocessar todos"}
      </button>

      <div className="w-full max-w-2xl" aria-live="polite">
        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--muted-foreground)]">
            {mensagemErro ?? progresso.etapa}
          </span>
          <span className="font-semibold tabular-nums">
            {progresso.percentual}%
          </span>
        </div>

        <div
          className="h-3 overflow-hidden rounded-full bg-[var(--muted)]"
          role="progressbar"
          aria-label="Progresso do reprocessamento global"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso.percentual}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              estado === "failed"
                ? "bg-red-600"
                : concluido
                  ? "bg-green-600"
                  : "bg-blue-700"
            }`}
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>

        {(executando || concluido) && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {progresso.processadas} marcações processadas;{" "}
            {progresso.competenciasRecalculadas} de{" "}
            {progresso.totalCompetencias} competências recalculadas;{" "}
            {progresso.erros} erros.
          </p>
        )}

        {concluido && resultado && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {resultado.pendentesRestantes} pendências permanecem;{" "}
            {resultado.semServidorCorrespondente} sem servidor correspondente;{" "}
            {resultado.periodosHomologados} bloqueadas por homologação.
          </p>
        )}
      </div>
    </div>
  );
}
