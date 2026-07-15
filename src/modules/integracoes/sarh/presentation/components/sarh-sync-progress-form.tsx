"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  SarhEndpointKey,
  SarhResumoExecucao,
  SarhSyncProgress,
} from "../../domain/sarh.types";

const STORAGE_JOB_ID = "secp:sarh-sync:job-id";

const endpointsDisponiveis: Array<[SarhEndpointKey, string]> = [
  ["empresas", "Empresas / Seções Judiciárias"],
  ["lotacoes", "Lotações / Departamentos"],
  ["cargos", "Cargos"],
  ["servidores", "Pessoas"],
  ["lotacoesServidores", "Lotações dos servidores"],
  ["tiposAfastamento", "Tipos de afastamento"],
  ["afastamentos", "Afastamentos"],
  ["chefias", "Chefias"],
  ["calendarios", "Calendários institucionais"],
];

const endpointsCompativeisComMatricula = new Set<SarhEndpointKey>([
  "servidores",
  "lotacoesServidores",
  "afastamentos",
  "chefias",
  "calendarios",
]);

const todosEndpoints = endpointsDisponiveis.map(([value]) => value);
const endpointLabels = new Map(endpointsDisponiveis);

type JobEstado =
  | "waiting"
  | "delayed"
  | "active"
  | "completed"
  | "failed"
  | "unknown";

type SarhSyncStatusResponse = {
  jobId: string;
  estado: JobEstado;
  progresso: SarhSyncProgress;
  resultado?: SarhResumoExecucao | null;
  erro?: string | null;
};

type ResumoDetalhe = {
  rotulo: string;
  valor: number;
};

function progressoInicial(): SarhSyncProgress {
  return {
    percentualGeral: 0,
    percentualEndpoint: 0,
    endpointAtual: null,
    endpointIndice: 0,
    totalEndpoints: 0,
    etapa: "Pronto para iniciar",
    status: "AGENDADA",
    contadores: {
      totalRecebidos: 0,
      totalCriados: 0,
      totalAtualizados: 0,
      totalInativados: 0,
      totalIgnorados: 0,
      totalErros: 0,
      totalConflitos: 0,
    },
  };
}

function montarResumo(
  progresso: SarhSyncProgress,
  resultado?: SarhResumoExecucao | null,
): ResumoDetalhe[] {
  const contadores = resultado ?? progresso.contadores;

  return [
    ["Recebidos", contadores.totalRecebidos],
    ["Criados", contadores.totalCriados],
    ["Atualizados", contadores.totalAtualizados],
    ["Inativados", contadores.totalInativados],
    ["Ignorados", contadores.totalIgnorados],
    ["Erros", contadores.totalErros],
    ["Conflitos", contadores.totalConflitos],
  ].map(([rotulo, valor]) => ({ rotulo: String(rotulo), valor: Number(valor) }));
}

function estadoEmAndamento(estado: JobEstado | null) {
  return estado === "waiting" || estado === "delayed" || estado === "active";
}

export function SarhSyncProgressForm({ orgaoId }: { orgaoId?: string | null }) {
  const [matriculaFiltro, setMatriculaFiltro] = useState("");
  const [endpointsSelecionados, setEndpointsSelecionados] =
    useState<SarhEndpointKey[]>(todosEndpoints);
  const [modoSelecionado, setModoSelecionado] = useState<
    "simulacao" | "aplicar" | null
  >(null);
  const [jobId, setJobId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(STORAGE_JOB_ID),
  );
  const [estadoJob, setEstadoJob] = useState<JobEstado | null>(null);
  const [progresso, setProgresso] = useState<SarhSyncProgress>(
    progressoInicial,
  );
  const [resultado, setResultado] = useState<SarhResumoExecucao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enfileirando, setEnfileirando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const matriculaAtiva = Boolean(matriculaFiltro.trim());
  const emAndamento = enfileirando || estadoEmAndamento(estadoJob);
  const endpointAtualRotulo = progresso.endpointAtual
    ? endpointLabels.get(progresso.endpointAtual)
    : estadoJob === "completed"
      ? "Todos os endpoints concluídos"
      : estadoJob === "failed"
        ? "Execução interrompida"
        : "Aguardando início";
  const statusVisual = enfileirando
    ? "ENFILEIRANDO"
    : estadoJob === "completed"
      ? "CONCLUÍDA"
      : estadoJob === "failed"
        ? "FALHA"
        : estadoJob === "active"
          ? "EM EXECUÇÃO"
          : estadoJob === "waiting" || estadoJob === "delayed"
            ? "AGENDADA"
            : "PRONTO";
  const corBarra =
    estadoJob === "failed"
      ? "bg-red-600"
      : estadoJob === "completed"
        ? "bg-green-600"
        : "bg-blue-700";
  const resumo = useMemo(
    () => montarResumo(progresso, resultado),
    [progresso, resultado],
  );

  const pararPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const consultarStatus = useCallback(
    async (id: string) => {
      const response = await fetch(
        `/api/integracoes/sarh/sincronizar?jobId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar a sincronização SARH.");
      }

      const status = (await response.json()) as SarhSyncStatusResponse;
      setJobId(status.jobId);
      setEstadoJob(status.estado);
      setProgresso(status.progresso);
      setResultado(status.resultado ?? null);
      setErro(status.erro ?? null);

      if (status.estado === "completed" || status.estado === "failed") {
        pararPolling();
        window.localStorage.removeItem(STORAGE_JOB_ID);
      }
    },
    [pararPolling],
  );

  const iniciarPolling = useCallback(
    (id: string) => {
      pararPolling();
      void consultarStatus(id).catch((error) => {
        setErro(error instanceof Error ? error.message : String(error));
      });
      intervalRef.current = setInterval(() => {
        void consultarStatus(id).catch((error) => {
          setErro(error instanceof Error ? error.message : String(error));
        });
      }, 1500);
    },
    [consultarStatus, pararPolling],
  );

  useEffect(() => {
    if (jobId) {
      const timeout = setTimeout(() => iniciarPolling(jobId), 0);

      return () => {
        clearTimeout(timeout);
        pararPolling();
      };
    }

    return () => pararPolling();
  }, [iniciarPolling, jobId, pararPolling]);

  function endpointsEfetivos() {
    if (!matriculaFiltro.trim()) {
      return endpointsSelecionados;
    }

    const compativeis = endpointsSelecionados.filter((endpoint) =>
      endpointsCompativeisComMatricula.has(endpoint),
    );

    return compativeis.length
      ? compativeis
      : todosEndpoints.filter((endpoint) =>
          endpointsCompativeisComMatricula.has(endpoint),
        );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const modo = submitter?.value === "aplicar" ? "aplicar" : "simulacao";

    setModoSelecionado(modo);
    setEnfileirando(true);
    setErro(null);
    setResultado(null);
    setProgresso({
      ...progressoInicial(),
      etapa: "Enfileirando sincronização SARH",
    });

    try {
      const response = await fetch("/api/integracoes/sarh/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo,
          orgaoId: orgaoId || undefined,
          matricula: matriculaFiltro.trim() || undefined,
          endpoints: endpointsEfetivos(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Falha ao enfileirar sincronização.");
      }

      const status = (await response.json()) as SarhSyncStatusResponse;
      setJobId(status.jobId);
      setEstadoJob(status.estado);
      setProgresso(status.progresso);
      window.localStorage.setItem(STORAGE_JOB_ID, status.jobId);
      iniciarPolling(status.jobId);
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
      setEstadoJob("failed");
    } finally {
      setEnfileirando(false);
    }
  }

  function alternarEndpoint(endpoint: SarhEndpointKey, marcado: boolean) {
    setEndpointsSelecionados((atuais) => {
      if (marcado) {
        return atuais.includes(endpoint) ? atuais : [...atuais, endpoint];
      }

      return atuais.filter((item) => item !== endpoint);
    });
  }

  function handleMatriculaChange(valor: string) {
    setMatriculaFiltro(valor);

    if (!valor.trim()) return;

    setEndpointsSelecionados((atuais) => {
      const compativeis = atuais.filter((endpoint) =>
        endpointsCompativeisComMatricula.has(endpoint),
      );

      return compativeis.length
        ? compativeis
        : todosEndpoints.filter((endpoint) =>
            endpointsCompativeisComMatricula.has(endpoint),
          );
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          Executar sincronização
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          A sincronização roda em fila. Você pode sair desta tela e voltar para
          acompanhar o andamento.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status da execução
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {statusVisual}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
              {Math.round(progresso.percentualGeral)}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {modoSelecionado === "aplicar"
                ? "Aplicação real"
                : modoSelecionado === "simulacao"
                  ? "Simulação"
                  : "Modo não iniciado"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Endpoint em execução
              </p>
              <p className="mt-1 text-base font-semibold text-blue-800 dark:text-blue-300">
                {endpointAtualRotulo}
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-slate-950 dark:text-slate-50">
                {Math.round(progresso.percentualEndpoint)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {progresso.totalEndpoints
                  ? `${progresso.endpointIndice}/${progresso.totalEndpoints}`
                  : "0/0"}
              </p>
            </div>
          </div>

          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso.percentualEndpoint}
            aria-label="Progresso do endpoint SARH em execução"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${corBarra}`}
              style={{ width: `${progresso.percentualEndpoint}%` }}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Progresso geral</span>
            <span className="tabular-nums">
              {Math.round(progresso.percentualGeral)}%
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso.percentualGeral}
            aria-label="Progresso geral da sincronização SARH"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${corBarra}`}
              style={{ width: `${progresso.percentualGeral}%` }}
            />
          </div>
        </div>

        <div
          className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
          aria-live="polite"
        >
          {emAndamento ? (
            <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-blue-700" />
          ) : (
            <span
              className={`mt-1 h-2 w-2 rounded-full ${
                estadoJob === "failed"
                  ? "bg-red-600"
                  : estadoJob === "completed"
                    ? "bg-green-600"
                    : "bg-slate-400"
              }`}
            />
          )}
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {erro ?? progresso.etapa}
            </p>
            {jobId && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Job: <span className="font-mono">{jobId}</span>
              </p>
            )}
          </div>
        </div>

        {(estadoJob || resultado) && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {resumo.map((item) => (
              <div
                key={item.rotulo}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.rotulo}
                </p>
                <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                  {item.valor}
                </p>
              </div>
            ))}
          </div>
        )}

        {(resultado?.execucaoId || progresso.execucaoId) && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Execução registrada:{" "}
            <span className="font-mono">
              {resultado?.execucaoId ?? progresso.execucaoId}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
          htmlFor="matricula"
        >
          Filtrar matrícula opcional
        </label>
        <input
          id="matricula"
          name="matricula"
          value={matriculaFiltro}
          onChange={(event) => handleMatriculaChange(event.target.value)}
          placeholder="Ex.: AM27803"
          disabled={emAndamento}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
        />
        {matriculaAtiva && (
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Com filtro por matrícula, são executados servidores, lotações do
            servidor, afastamentos, chefias e calendários institucionais.
          </p>
        )}
      </div>

      <fieldset className="space-y-3" disabled={emAndamento}>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Endpoints
        </legend>
        <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-200">
          {endpointsDisponiveis.map(([value, label]) => {
            const compativel = endpointsCompativeisComMatricula.has(value);
            const desabilitadoPorMatricula = matriculaAtiva && !compativel;

            return (
              <label
                key={value}
                className={`flex items-center gap-2 ${
                  desabilitadoPorMatricula
                    ? "text-slate-400 dark:text-slate-500"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="endpoints"
                  value={value}
                  checked={endpointsSelecionados.includes(value)}
                  onChange={(event) =>
                    alternarEndpoint(value, event.target.checked)
                  }
                  disabled={emAndamento || desabilitadoPorMatricula}
                  className="h-4 w-4"
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="modo"
          value="simulacao"
          disabled={emAndamento}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
        >
          {emAndamento && modoSelecionado === "simulacao"
            ? "Simulando..."
            : "Simular"}
        </button>
        <button
          type="submit"
          name="modo"
          value="aplicar"
          disabled={emAndamento}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emAndamento && modoSelecionado === "aplicar"
            ? "Aplicando..."
            : "Aplicar sincronização"}
        </button>
      </div>
    </form>
  );
}
