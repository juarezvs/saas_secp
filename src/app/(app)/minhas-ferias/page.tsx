import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, TreePalm } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import {
  listarFeriasPorPeriodoAquisitivo,
  listarPeriodosAquisitivosFerias,
} from "@/modules/servidores/infrastructure/repositories/ferias.repository";

type MinhasFeriasPageProps = {
  searchParams?: Promise<{
    exercicio?: string;
  }>;
};

type FeriasItem = Awaited<
  ReturnType<typeof listarFeriasPorPeriodoAquisitivo>
>[number];

function formatarData(data: Date | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function classePeriodo(ativo: boolean) {
  return [
    "flex min-h-20 flex-col justify-between rounded-md border px-3 py-2 text-left transition",
    ativo
      ? "border-blue-900 bg-blue-50 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100"
      : "bg-[var(--card)] hover:border-blue-300 hover:bg-[var(--muted)]/50",
  ].join(" ");
}

function classeStatus(status: string) {
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

function rotuloStatus(status: string) {
  if (status === "EM_GOZO") return "Em gozo";
  if (status === "PROGRAMADA") return "Programada";
  if (status === "INATIVA") return "Inativa";
  return "Encerrada";
}

function calcularDiasFerias(ferias: FeriasItem) {
  if (typeof ferias.dias === "number" && Number.isFinite(ferias.dias)) {
    return ferias.dias;
  }

  if (!ferias.dataFim) {
    return null;
  }

  const inicio = Date.UTC(
    ferias.dataInicio.getUTCFullYear(),
    ferias.dataInicio.getUTCMonth(),
    ferias.dataInicio.getUTCDate(),
  );
  const fim = Date.UTC(
    ferias.dataFim.getUTCFullYear(),
    ferias.dataFim.getUTCMonth(),
    ferias.dataFim.getUTCDate(),
  );
  const dias = Math.floor((fim - inicio) / 86_400_000) + 1;

  return dias > 0 ? dias : null;
}

function statusFerias(ferias: FeriasItem) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(ferias.dataInicio);
  inicio.setHours(0, 0, 0, 0);
  const fim = ferias.dataFim ? new Date(ferias.dataFim) : null;
  fim?.setHours(0, 0, 0, 0);

  if (!ferias.ativo) return "INATIVA";
  if (inicio > hoje) return "PROGRAMADA";
  if (!fim || fim >= hoje) return "EM_GOZO";
  return "ENCERRADA";
}

function descricaoOcorrenciaPorCodigo(codigo: string | null) {
  const normalizado = codigo?.trim();
  const ocorrencias: Record<string, string> = {
    "1": "MARCADA",
    "2": "GOZADA",
    "3": "ANTECIPADA",
    "4": "ADIADA",
    "5": "INTERROMPIDA",
    "6": "INDISPONIBILIZADA",
    "7": "SUSPENSA",
  };

  return normalizado ? ocorrencias[normalizado] : null;
}

function ocorrenciaFerias(ferias: FeriasItem) {
  if (ferias.tipoDescricao && ferias.tipoDescricao !== "FERIAS") {
    return ferias.tipoDescricao;
  }

  return descricaoOcorrenciaPorCodigo(ferias.tipoCodigo) || "Férias";
}

function TabelaFeriasExercicio({
  ferias,
  exercicioSelecionado,
}: {
  ferias: FeriasItem[];
  exercicioSelecionado: number | null;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-2 border-b p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {exercicioSelecionado
              ? `Férias do exercício ${exercicioSelecionado}`
              : "Férias sem exercício informado"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Programações importadas do SARH para o período selecionado.
          </p>
        </div>
        <span className="w-fit rounded-full border bg-[var(--muted)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {ferias.length} ocorrência{ferias.length === 1 ? "" : "s"}
        </span>
      </div>

      {ferias.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhuma programação de férias encontrada para o exercício selecionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Ocorrência</th>
                <th className="px-5 py-3">Dias</th>
                <th className="px-5 py-3">Processo</th>
                <th className="px-5 py-3">Motivo/observação</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {ferias.map((item) => {
                const status = statusFerias(item);

                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-medium">
                      {formatarData(item.dataInicio)} até{" "}
                      {formatarData(item.dataFim)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border bg-[var(--muted)] px-2 py-1 text-xs font-semibold uppercase">
                        {ocorrenciaFerias(item)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {calcularDiasFerias(item) ?? "-"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.processo || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-xl whitespace-normal text-sm text-[var(--muted-foreground)]">
                        {item.observacao || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(
                          status,
                        )}`}
                      >
                        {rotuloStatus(status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function MinhasFeriasPage({
  searchParams,
}: MinhasFeriasPageProps) {
  const [permissao, query] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(["afastamentos:consultar:proprio"]),
    searchParams,
  ]);

  if (!permissao.usuarioId) {
    redirect("/login");
  }

  const servidor = await buscarServidorPorUsuarioId(permissao.usuarioId);

  if (!servidor) {
    redirect("/acesso-negado?motivo=servidor-nao-localizado");
  }

  const periodos = await listarPeriodosAquisitivosFerias(servidor.id);
  const exercicioParam = Number(query?.exercicio ?? "");
  const exercicioSelecionado = Number.isInteger(exercicioParam)
    ? exercicioParam
    : periodos[0]?.exercicio ?? null;
  const ferias = await listarFeriasPorPeriodoAquisitivo({
    servidorId: servidor.id,
    exercicio: exercicioSelecionado,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Minhas férias" },
        ]}
      />

      <PageHeader
        icon={TreePalm}
        titulo="Minhas férias"
        descricao="Consulte sua programação de férias por período aquisitivo sincronizado do SARH."
      />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-3 border-b p-5">
          <span className="secp-theme-icon flex size-11 shrink-0 items-center justify-center rounded-lg">
            <CalendarRange className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Períodos aquisitivos</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Escolha o exercício para consultar as férias correspondentes.
            </p>
          </div>
        </div>

        {periodos.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum período de férias sincronizado do SARH para sua matrícula.
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <form
              action="/minhas-ferias"
              className="grid gap-3 md:grid-cols-[minmax(16rem,24rem)_auto] md:items-end"
            >
              <div className="space-y-2">
                <label htmlFor="exercicio" className="text-sm font-semibold">
                  Período aquisitivo
                </label>
                <select
                  id="exercicio"
                  name="exercicio"
                  defaultValue={exercicioSelecionado ?? ""}
                  className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                >
                  {periodos.map((periodo) => (
                    <option key={periodo.chave} value={periodo.exercicio ?? ""}>
                      {periodo.label} - {rotuloStatus(periodo.status)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950"
              >
                Consultar
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {periodos.map((periodo) => {
                const ativo = periodo.exercicio === exercicioSelecionado;
                const href = periodo.exercicio
                  ? `/minhas-ferias?${new URLSearchParams({
                      exercicio: String(periodo.exercicio),
                    }).toString()}`
                  : "/minhas-ferias";

                return (
                  <Link
                    key={periodo.chave}
                    href={href}
                    className={classePeriodo(ativo)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">
                        {periodo.exercicio ?? "S/ exercício"}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${classeStatus(
                          periodo.status,
                        )}`}
                      >
                        {rotuloStatus(periodo.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      {periodo.totalPeriodos} período(s),{" "}
                      {periodo.diasProgramados} dia(s)
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <TabelaFeriasExercicio
        ferias={ferias}
        exercicioSelecionado={exercicioSelecionado}
      />
    </div>
  );
}
