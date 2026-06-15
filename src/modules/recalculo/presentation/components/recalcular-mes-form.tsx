"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { recalcularMesServidorAction } from "../../application/actions/recalcular-mes-servidor.action";

type RecalcularMesFormProps = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
};

export function RecalcularMesForm({
  servidorId,
  anoReferencia,
  mesReferencia,
}: RecalcularMesFormProps) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [iniciado, setIniciado] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!pendente) return;

    intervalRef.current = setInterval(() => {
      setProgresso((atual) => {
        const incremento = atual < 35 ? 5 : atual < 70 ? 3 : 1;
        return Math.min(atual + incremento, 94);
      });
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pendente]);

  function recalcular() {
    setIniciado(true);
    setConcluido(false);
    setProgresso(5);

    const formData = new FormData();
    formData.set("servidorId", servidorId);
    formData.set("anoReferencia", String(anoReferencia));
    formData.set("mesReferencia", String(mesReferencia));

    iniciarTransicao(async () => {
      await recalcularMesServidorAction(formData);
      setProgresso(100);
      setConcluido(true);
      router.refresh();
    });
  }

  const progressoVisual = concluido ? 100 : progresso;

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
      <button
        type="button"
        disabled={pendente}
        onClick={recalcular}
        className="shrink-0 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente
          ? "Recalculando mês e banco de horas..."
          : "Recalcular mês e banco de horas"}
      </button>

      <div className="w-full max-w-xl" aria-live="polite">
        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--muted-foreground)]">
            {pendente
              ? "Recalculando apurações e movimentos do banco de horas"
              : concluido
                ? "Recálculo concluído"
                : "Aguardando recálculo"}
          </span>
          <span className="font-semibold tabular-nums">
            {progressoVisual}%
          </span>
        </div>

        <div
          className="h-3 overflow-hidden rounded-full bg-[var(--muted)]"
          role="progressbar"
          aria-label="Progresso visual do recálculo mensal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressoVisual}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              concluido ? "bg-green-600" : "bg-blue-700"
            }`}
            style={{ width: `${progressoVisual}%` }}
          />
        </div>

        {iniciado && concluido && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            As horas trabalhadas, os créditos e os débitos foram atualizados.
          </p>
        )}
      </div>
    </div>
  );
}
