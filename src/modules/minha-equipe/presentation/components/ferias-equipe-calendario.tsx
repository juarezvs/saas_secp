import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Umbrella,
  Users,
} from "lucide-react";

import type {
  FeriasEquipeCalendarioDados,
  FeriasEquipeItem,
  StatusFeriasEquipe,
} from "../../infrastructure/repositories/minha-equipe.repository";

type FeriasEquipeCalendarioProps = {
  dados: FeriasEquipeCalendarioDados;
  dataReferencia: string;
  unidadesSelecionadas: string[];
  montarHrefAno: (ano: number) => string;
};

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const estilosStatus: Record<
  StatusFeriasEquipe,
  {
    borda: string;
    fundo: string;
    texto: string;
    ponto: string;
  }
> = {
  PROGRAMADA: {
    borda: "border-blue-700",
    fundo: "bg-blue-50/80 dark:bg-blue-950/30",
    texto: "text-blue-900 dark:text-blue-200",
    ponto: "bg-blue-600",
  },
  GOZADA: {
    borda: "border-green-700",
    fundo: "bg-green-50/80 dark:bg-green-950/30",
    texto: "text-green-900 dark:text-green-200",
    ponto: "bg-green-600",
  },
  CANCELADA: {
    borda: "border-red-700",
    fundo: "bg-red-50/80 dark:bg-red-950/30",
    texto: "text-red-900 dark:text-red-200",
    ponto: "bg-red-600",
  },
  ALTERADA: {
    borda: "border-amber-600",
    fundo: "bg-amber-50/80 dark:bg-amber-950/30",
    texto: "text-amber-900 dark:text-amber-200",
    ponto: "bg-amber-600",
  },
  INATIVA: {
    borda: "border-slate-500",
    fundo: "bg-slate-50/80 dark:bg-slate-900/40",
    texto: "text-slate-800 dark:text-slate-200",
    ponto: "bg-slate-500",
  },
};

const legendaStatus: Array<{ status: StatusFeriasEquipe; label: string }> = [
  { status: "PROGRAMADA", label: "Programada" },
  { status: "GOZADA", label: "Gozada" },
  { status: "CANCELADA", label: "Cancelada/alterada" },
  { status: "ALTERADA", label: "Alterada" },
  { status: "INATIVA", label: "Inativa" },
];

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(data);
}

function formatarPeriodo(item: FeriasEquipeItem) {
  return `${formatarData(item.dataInicio)} a ${formatarData(item.dataFim)}`;
}

function formatarPeriodoNoMes(item: FeriasEquipeItem, ano: number, mes: number) {
  const inicio = inicioMes(ano, mes);
  const fimExclusivo = inicioMesSeguinte(ano, mes);
  const fimMes = new Date(fimExclusivo.getTime() - 1);
  const inicioExibido =
    item.dataInicio.getTime() > inicio.getTime() ? item.dataInicio : inicio;
  const fimExibido =
    item.dataFim.getTime() < fimMes.getTime() ? item.dataFim : fimMes;

  return `${formatarData(inicioExibido)} a ${formatarData(fimExibido)}`;
}

function inicioMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 1));
}

function inicioMesSeguinte(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes + 1, 1));
}

function feriasNoMes(itens: FeriasEquipeItem[], ano: number, mes: number) {
  const inicio = inicioMes(ano, mes);
  const fimExclusivo = inicioMesSeguinte(ano, mes);

  return itens
    .filter((item) => item.dataInicio < fimExclusivo && item.dataFim >= inicio)
    .sort((a, b) => {
      const unidade = a.unidadeSigla.localeCompare(b.unidadeSigla, "pt-BR", {
        sensitivity: "base",
      });

      if (unidade !== 0) return unidade;

      return a.dataInicio.getTime() - b.dataInicio.getTime();
    });
}

function nomeServidorCurto(nome: string) {
  const partes = nome.split(" ").filter(Boolean);

  if (partes.length <= 2) return nome;

  return `${partes[0]} ${partes.at(-1)}`;
}

export function FeriasEquipeCalendario({
  dados,
  dataReferencia,
  unidadesSelecionadas,
  montarHrefAno,
}: FeriasEquipeCalendarioProps) {
  const anoAtual = new Date().getFullYear();
  const mesesComFerias = meses.map((mes, indice) => ({
    mes,
    indice,
    itens: feriasNoMes(dados.itens, dados.ano, indice),
  }));

  return (
    <section className="rounded-md border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-blue-900 dark:text-blue-200">
            <CalendarDays className="size-4" aria-hidden="true" />
            Programação de férias
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-normal">
            Calendário da equipe em {dados.ano}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Visualize as férias da equipe por mês, incluindo períodos programados,
            gozados, cancelados ou alterados, conforme os dados sincronizados do
            SARH.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Link
              href={montarHrefAno(dados.ano - 1)}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border transition hover:bg-muted"
              aria-label={`Ver férias de ${dados.ano - 1}`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={montarHrefAno(anoAtual)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold transition hover:bg-muted"
            >
              Ano atual
            </Link>
            <Link
              href={montarHrefAno(dados.ano + 1)}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border transition hover:bg-muted"
              aria-label={`Ver férias de ${dados.ano + 1}`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <form action="/minha-equipe" className="flex items-center gap-2">
            <input type="hidden" name="data" value={dataReferencia} />
            {unidadesSelecionadas.map((unidadeId) => (
              <input
                key={unidadeId}
                type="hidden"
                name="unidadeId"
                value={unidadeId}
              />
            ))}
            <label htmlFor="anoFerias" className="sr-only">
              Ano das férias
            </label>
            <input
              id="anoFerias"
              name="anoFerias"
              type="number"
              min={2000}
              max={2100}
              defaultValue={dados.ano}
              className="h-10 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Ver ano
            </button>
          </form>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Períodos de férias
          </p>
          <p className="mt-2 text-3xl font-bold">{dados.resumo.periodos}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Servidores com férias
          </p>
          <p className="mt-2 text-3xl font-bold">{dados.resumo.servidores}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Mês com maior concentração
          </p>
          <p className="mt-2 text-2xl font-bold capitalize">
            {dados.resumo.mesMaisMovimentado}
          </p>
        </div>
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Maior volume mensal
          </p>
          <p className="mt-2 text-3xl font-bold">
            {dados.resumo.maiorQuantidadeMes}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        {legendaStatus.map(({ status, label }) => {
          const estilo = estilosStatus[status];

          return (
            <span
              key={status}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1"
            >
              <span className={`size-2.5 rounded-full ${estilo.ponto}`} />
              {label}
            </span>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {mesesComFerias.map(({ mes, indice, itens }) => (
          <article
            key={mes}
            className="rounded-md border border-border bg-background p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">{mes}</h3>
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                {itens.length}
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {itens.slice(0, 5).map((item) => {
                const estilo = estilosStatus[item.status];

                return (
                  <div
                    key={`${mes}-${item.id}`}
                    className={`rounded-md border-l-4 px-3 py-2 text-sm ${estilo.borda} ${estilo.fundo}`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {nomeServidorCurto(item.servidorNome)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.unidadeSigla} · {item.unidadeNome}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold ${estilo.texto}`}
                        title={`Período completo: ${formatarPeriodo(item)}`}
                      >
                        {formatarPeriodoNoMes(item, dados.ano, indice)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={`font-bold ${estilo.texto}`}>
                        {item.statusLabel}
                      </span>
                      {(item.dias || item.exercicio) && (
                        <span className="text-muted-foreground">
                          {item.dias ? `${item.dias} dia(s)` : null}
                          {item.dias && item.exercicio ? " · " : null}
                          {item.exercicio ? `Exercício ${item.exercicio}` : null}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {itens.length > 5 && (
                <div className="rounded-md border border-dashed border-border p-2 text-center text-xs font-semibold text-muted-foreground">
                  +{itens.length - 5} período(s) neste mês
                </div>
              )}

              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Sem férias neste mês.
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {dados.itens.length === 0 && (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Umbrella className="size-6" aria-hidden="true" />
          Nenhuma programação de férias encontrada para este ano e escopo.
        </div>
      )}

      {dados.itens.length > 0 && (
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-4" aria-hidden="true" />
          Dados consolidados a partir dos afastamentos de férias sincronizados do
          SARH.
        </div>
      )}
    </section>
  );
}
