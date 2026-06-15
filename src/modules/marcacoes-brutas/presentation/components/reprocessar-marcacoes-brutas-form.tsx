"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  reprocessarMarcacoesBrutasPendentesAction,
  type ReprocessarMarcacoesBrutasState,
} from "@/modules/marcacoes-brutas/application/actions/reprocessar-marcacoes-brutas-pendentes.action";

const estadoInicial: ReprocessarMarcacoesBrutasState = {
  ok: null,
  mensagem: "Aguardando o reprocessamento.",
};

export function ReprocessarMarcacoesBrutasForm({
  rotuloBotao = "Reprocessar marcações brutas pendentes",
}: {
  rotuloBotao?: string;
}) {
  const [estado, formAction, pendente] = useActionState(
    reprocessarMarcacoesBrutasPendentesAction,
    estadoInicial,
  );
  const [iniciado, setIniciado] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const continuacaoRef = useRef<HTMLInputElement | null>(null);

  const pararAnimacao = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function handleSubmit() {
    pararAnimacao();
    setIniciado(true);
    setProgresso(5);
  }

  useEffect(() => {
    if (!pendente) return;

    pararAnimacao();
    intervalRef.current = setInterval(() => {
      setProgresso((atual) => {
        const incremento = atual < 35 ? 5 : atual < 70 ? 3 : 1;
        return Math.min(atual + incremento, 94);
      });
    }, 500);

    return pararAnimacao;
  }, [pararAnimacao, pendente]);

  const temProximoLote = Boolean(estado.resultado?.proximoCursor);

  useEffect(() => {
    if (!iniciado || pendente || !temProximoLote || estado.ok !== true) {
      return;
    }

    const timeout = setTimeout(() => {
      if (continuacaoRef.current) {
        continuacaoRef.current.value = "true";
      }
      formRef.current?.requestSubmit();
    }, 150);

    return () => clearTimeout(timeout);
  }, [estado.ok, iniciado, pendente, temProximoLote]);

  const finalizado =
    iniciado && !pendente && estado.ok !== null && !temProximoLote;
  const progressoVisual = finalizado ? 100 : progresso;
  const corBarra =
    estado.ok === false
      ? "bg-red-600"
      : estado.ok === true
        ? "bg-green-600"
        : "bg-blue-700";

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="mt-4"
    >
      <input ref={continuacaoRef} type="hidden" name="continuar" value="false" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <button
          type="submit"
          disabled={pendente}
          onClick={() => {
            if (continuacaoRef.current) {
              continuacaoRef.current.value = "false";
            }
          }}
          className="shrink-0 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente
            ? "Reprocessando marcações..."
            : rotuloBotao}
        </button>

        <div className="w-full max-w-xl" aria-live="polite">
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted-foreground)]">
              {pendente
                ? "Associando aos servidores e depois processando"
                : temProximoLote
                  ? "Preparando o próximo lote"
                : finalizado
                  ? estado.mensagem
                  : "Aguardando processamento"}
            </span>
            <span className="font-semibold tabular-nums">
              {progressoVisual}%
            </span>
          </div>

          <div
            className="h-3 overflow-hidden rounded-full bg-[var(--muted)]"
            role="progressbar"
            aria-label="Progresso visual do reprocessamento de marcações"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressoVisual}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${corBarra}`}
              style={{ width: `${progressoVisual}%` }}
            />
          </div>

          {iniciado && !pendente && estado.resultado && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {estado.resultado.lotesExecutados} lote(s),{" "}
              {estado.resultado.associadasAcumuladas} associadas ao servidor,{" "}
              {estado.resultado.processadasAcumuladas} processadas e{" "}
              {estado.resultado.errosAcumulados} com erro.{" "}
              {estado.resultado.pendentesRestantes} pendências permanecem.{" "}
              {estado.resultado.semServidorCorrespondente} sem servidor
              correspondente, {estado.resultado.semJornadaVigente} sem jornada
              vigente e {estado.resultado.periodosHomologados} em períodos
              homologados.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
