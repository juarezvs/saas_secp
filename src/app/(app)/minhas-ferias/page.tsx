import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarRange,
  ClipboardList,
  PencilLine,
  TreePalm,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import {
  listarFeriasPorPeriodoAquisitivo,
  listarPeriodosAquisitivosFerias,
} from "@/modules/servidores/infrastructure/repositories/ferias.repository";
import { MinhasFeriasPeriodoSelect } from "@/modules/servidores/presentation/components/minhas-ferias-periodo-select";
import {
  buscarServidorFeriasPorUsuarioId,
  listarProgramacoesFeriasServidor,
  listarSaldosFeriasServidor,
} from "@/modules/programacao-ferias/infrastructure/repositories/programacao-ferias.repository";
import {
  MensagemFerias,
  NovaProgramacaoFeriasCard,
  ProgramacoesFeriasTable,
  SaldosFeriasCard,
} from "@/modules/programacao-ferias/presentation/components/programacao-ferias-ui";

type MinhasFeriasPageProps = {
  searchParams?: Promise<{
    aba?: string;
    exercicio?: string;
    ok?: string;
    erro?: string;
  }>;
};

type AbaMinhasFerias = "consulta" | "marcacao";

type FeriasItem = Awaited<
  ReturnType<typeof listarFeriasPorPeriodoAquisitivo>
>[number];

function formatarData(data: Date | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function normalizarAbaMinhasFerias(aba?: string): AbaMinhasFerias {
  return aba === "marcacao" ? "marcacao" : "consulta";
}

function montarHrefMinhasFeriasAba({
  aba,
  exercicioSelecionado,
}: {
  aba: AbaMinhasFerias;
  exercicioSelecionado: number | null;
}) {
  const params = new URLSearchParams();

  if (aba !== "consulta") {
    params.set("aba", aba);
  }

  if (exercicioSelecionado) {
    params.set("exercicio", String(exercicioSelecionado));
  }

  const query = params.toString();

  return query ? `/minhas-ferias?${query}` : "/minhas-ferias";
}

function AbasMinhasFerias({
  abaAtiva,
  exercicioSelecionado,
}: {
  abaAtiva: AbaMinhasFerias;
  exercicioSelecionado: number | null;
}) {
  const abas = [
    {
      id: "consulta" as const,
      titulo: "Consultar férias",
      descricao: "Programações e períodos importados",
      Icone: ClipboardList,
    },
    {
      id: "marcacao" as const,
      titulo: "Marcar férias",
      descricao: "Nova solicitação para a chefia",
      Icone: PencilLine,
    },
  ];

  return (
    <nav
      aria-label="Áreas de minhas férias"
      className="grid gap-3 rounded-xl border bg-[var(--card)] p-2 shadow-sm md:grid-cols-2"
    >
      {abas.map(({ id, titulo, descricao, Icone }) => {
        const ativa = abaAtiva === id;

        return (
          <Link
            key={id}
            href={montarHrefMinhasFeriasAba({
              aba: id,
              exercicioSelecionado,
            })}
            aria-current={ativa ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
              ativa
                ? "border-blue-900 bg-blue-900 text-white shadow-sm"
                : "border-transparent bg-[var(--muted)] text-[var(--foreground)] hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950"
            }`}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${
                ativa
                  ? "border-white/25 bg-white/15"
                  : "border-[var(--border)] bg-[var(--card)] text-blue-900"
              }`}
            >
              <Icone className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{titulo}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  ativa ? "text-blue-50" : "text-[var(--muted-foreground)]"
                }`}
              >
                {descricao}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Ocorrência</th>
                <th className="px-5 py-3">Dias</th>
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
    exigirUmaDasPermissoesOuRedirecionar([
      "programacao-ferias:consultar:proprio",
      "afastamentos:consultar:proprio",
    ]),
    searchParams,
  ]);

  if (!permissao.usuarioId) {
    redirect("/login");
  }

  const servidor =
    (await buscarServidorFeriasPorUsuarioId(permissao.usuarioId)) ??
    (await buscarServidorPorUsuarioId(permissao.usuarioId));

  if (!servidor) {
    redirect("/acesso-negado?motivo=servidor-não-localizado");
  }

  const periodos = await listarPeriodosAquisitivosFerias(servidor.id);
  const abaAtiva = normalizarAbaMinhasFerias(query?.aba);
  const exercicioParam =
    query?.exercicio && query.exercicio.trim()
      ? Number(query.exercicio)
      : Number.NaN;
  const exercicioSelecionado = Number.isInteger(exercicioParam)
    ? exercicioParam
    : periodos[0]?.exercicio ?? null;
  const [ferias, saldos, programacoesSecp] = await Promise.all([
    listarFeriasPorPeriodoAquisitivo({
      servidorId: servidor.id,
      exercicio: exercicioSelecionado,
    }),
    listarSaldosFeriasServidor(servidor.id),
    listarProgramacoesFeriasServidor(servidor.id),
  ]);

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
        descricao="Consulte suas férias marcadas ou registre uma nova programação para análise da chefia."
      />

      <MensagemFerias ok={query?.ok} erro={query?.erro} />

      <AbasMinhasFerias
        abaAtiva={abaAtiva}
        exercicioSelecionado={exercicioSelecionado}
      />

      {abaAtiva === "marcacao" ? (
        <>
          <SaldosFeriasCard saldos={saldos} />

          <NovaProgramacaoFeriasCard
            saldos={saldos}
            exercicioSelecionado={exercicioSelecionado}
          />
        </>
      ) : (
        <>
          <ProgramacoesFeriasTable programacoes={programacoesSecp} />

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
              <div className="p-5">
                <MinhasFeriasPeriodoSelect
                  periodos={periodos}
                  exercicioSelecionado={exercicioSelecionado}
                  aba={abaAtiva}
                />
              </div>
            )}
          </section>

          <TabelaFeriasExercicio
            ferias={ferias}
            exercicioSelecionado={exercicioSelecionado}
          />
        </>
      )}
    </div>
  );
}
