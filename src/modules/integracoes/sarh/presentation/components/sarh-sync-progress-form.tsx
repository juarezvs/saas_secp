"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  sincronizarSarhComProgressoAction,
  type SincronizarSarhActionState,
} from "../actions/sarh.actions";

const estadoInicial: SincronizarSarhActionState = {
  ok: null,
  mensagem: "Aguardando início da sincronização.",
};

const endpointsDisponiveis = [
  ["empresas", "Empresas / Seções Judiciárias"],
  ["lotacoes", "Lotações / Departamentos"],
  ["cargos", "Cargos"],
  ["servidores", "Servidores"],
  ["lotacoesServidores", "Lotações dos servidores"],
] as const;

function obterEtapaPorProgresso(progresso: number) {
  if (progresso < 18) return "Preparando execução e registrando início";
  if (progresso < 38) return "Buscando dados nos endpoints do SARH";
  if (progresso < 68) return "Normalizando CPF, matrícula, lotação, cargo e unidade";
  if (progresso < 90) return "Comparando payloads, aplicando regras e registrando itens";
  if (progresso < 100) return "Finalizando execução, logs e auditoria";
  return "Execução concluída";
}

function obterResumoDetalhes(detalhes: Record<string, unknown> | undefined) {
  if (!detalhes) return null;

  return [
    ["Recebidos", detalhes.totalRecebidos],
    ["Criados", detalhes.totalCriados],
    ["Atualizados", detalhes.totalAtualizados],
    ["Ignorados", detalhes.totalIgnorados],
    ["Erros", detalhes.totalErros],
    ["Conflitos", detalhes.totalConflitos],
  ].filter(([, valor]) => typeof valor === "number");
}

export function SarhSyncProgressForm() {
  const [estado, formAction, pendente] = useActionState(sincronizarSarhComProgressoAction, estadoInicial);
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState("Aguardando execução");
  const [modoSelecionado, setModoSelecionado] = useState<"simulacao" | "aplicar" | null>(null);
  const [submetido, setSubmetido] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararAnimacao() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const modo = submitter?.value === "aplicar" ? "aplicar" : "simulacao";

    pararAnimacao();
    setSubmetido(true);
    setModoSelecionado(modo);
    setProgresso(6);
    setEtapa("Preparando execução e registrando início");
  }

  useEffect(() => {
    if (!pendente) return;

    pararAnimacao();

    intervalRef.current = setInterval(() => {
      setProgresso((valorAtual) => {
        const incremento = valorAtual < 30 ? 4 : valorAtual < 70 ? 2 : 1;
        const proximoValor = Math.min(valorAtual + incremento, 92);
        setEtapa(obterEtapaPorProgresso(proximoValor));
        return proximoValor;
      });
    }, 700);

    return pararAnimacao;
  }, [pendente]);

  useEffect(() => {
    if (!submetido || pendente || estado.ok === null) return;

    pararAnimacao();
    setProgresso(100);
    setEtapa(estado.ok ? "Execução concluída com sucesso" : "Execução concluída com falha");
  }, [estado, pendente, submetido]);

  const resumo = obterResumoDetalhes(estado.detalhes);
  const statusVisual = pendente ? "EM EXECUÇÃO" : estado.ok === true ? "CONCLUÍDA" : estado.ok === false ? "FALHA" : "AGUARDANDO";
  const corBarra = estado.ok === false ? "bg-red-600" : estado.ok === true ? "bg-green-600" : "bg-blue-700";

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Executar sincronização</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Comece sempre por simulação. A aplicação efetiva altera as tabelas de domínio do SECP.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status da execução
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{statusVisual}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">{progresso}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {modoSelecionado === "aplicar" ? "Aplicação real" : modoSelecionado === "simulacao" ? "Simulação" : "Modo não iniciado"}
            </p>
          </div>
        </div>

        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso}
          aria-label="Progresso visual da sincronização SARH"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${corBarra}`}
            style={{ width: `${progresso}%` }}
          />
        </div>

        <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {pendente ? (
            <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-blue-700" />
          ) : (
            <span className={`mt-1 h-2 w-2 rounded-full ${estado.ok === false ? "bg-red-600" : estado.ok === true ? "bg-green-600" : "bg-slate-400"}`} />
          )}
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{etapa}</p>
            <p className="mt-1">{estado.mensagem}</p>
          </div>
        </div>

        {resumo && resumo.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {resumo.map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</p>
                <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{String(valor)}</p>
              </div>
            ))}
          </div>
        )}

        {estado.execucaoId && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Execução registrada: <span className="font-mono">{estado.execucaoId}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="matricula">
          Filtrar matrícula opcional
        </label>
        <input
          id="matricula"
          name="matricula"
          placeholder="Ex.: AM27803"
          disabled={pendente}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
        />
      </div>

      <fieldset className="space-y-3" disabled={pendente}>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Endpoints</legend>
        <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-200">
          {endpointsDisponiveis.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="checkbox" name="endpoints" value={value} defaultChecked className="h-4 w-4" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="modo"
          value="simulacao"
          disabled={pendente}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
        >
          {pendente && modoSelecionado === "simulacao" ? "Simulando..." : "Simular"}
        </button>
        <button
          type="submit"
          name="modo"
          value="aplicar"
          disabled={pendente}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente && modoSelecionado === "aplicar" ? "Aplicando..." : "Aplicar sincronização"}
        </button>
      </div>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        A barra indica o andamento visual da operação enquanto a Server Action executa no servidor. A conclusão,
        os totais processados e o identificador da execução são exibidos somente após o retorno real da sincronização.
      </p>
    </form>
  );
}
