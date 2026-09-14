"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Square,
  Umbrella,
  Users,
  X,
} from "lucide-react";

import type {
  FeriasEquipeCalendarioDados,
  FeriasEquipeItem,
  StatusFeriasEquipe,
  UnidadeMinhaEquipe,
} from "../../infrastructure/repositories/minha-equipe.repository";

type FeriasEquipeCalendarioProps = {
  dados: FeriasEquipeCalendarioDados;
  dataReferencia: string;
  unidadesSelecionadas: string[];
  hrefAnoAnterior: string;
  hrefAnoAtual: string;
  hrefAnoSeguinte: string;
  actionPath?: string;
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

function dataNormalizada(data: Date | string) {
  return data instanceof Date ? data : new Date(data);
}

function formatarData(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(dataNormalizada(data));
}

function formatarPeriodo(item: FeriasEquipeItem) {
  return `${formatarData(item.dataInicio)} a ${formatarData(item.dataFim)}`;
}

function inicioMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 1));
}

function inicioMesSeguinte(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes + 1, 1));
}

function formatarPeriodoNoMes(item: FeriasEquipeItem, ano: number, mes: number) {
  const inicio = inicioMes(ano, mes);
  const fimExclusivo = inicioMesSeguinte(ano, mes);
  const fimMes = new Date(fimExclusivo.getTime() - 1);
  const dataInicio = dataNormalizada(item.dataInicio);
  const dataFim = dataNormalizada(item.dataFim);
  const inicioExibido =
    dataInicio.getTime() > inicio.getTime() ? dataInicio : inicio;
  const fimExibido = dataFim.getTime() < fimMes.getTime() ? dataFim : fimMes;

  return `${formatarData(inicioExibido)} a ${formatarData(fimExibido)}`;
}

function feriasNoMes(itens: FeriasEquipeItem[], ano: number, mes: number) {
  const inicio = inicioMes(ano, mes);
  const fimExclusivo = inicioMesSeguinte(ano, mes);

  return itens
    .filter((item) => {
      const dataInicio = dataNormalizada(item.dataInicio);
      const dataFim = dataNormalizada(item.dataFim);

      return dataInicio < fimExclusivo && dataFim >= inicio;
    })
    .sort((a, b) => {
      const unidade = a.unidadeSigla.localeCompare(b.unidadeSigla, "pt-BR", {
        sensitivity: "base",
      });

      if (unidade !== 0) return unidade;

      return (
        dataNormalizada(a.dataInicio).getTime() -
        dataNormalizada(b.dataInicio).getTime()
      );
    });
}

function nomeServidorCurto(nome: string) {
  const partes = nome.split(" ").filter(Boolean);

  if (partes.length <= 2) return nome;

  return `${partes[0]} ${partes.at(-1)}`;
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function idsDescendentes(unidades: UnidadeMinhaEquipe[], unidadeId: string) {
  const filhosPorPai = new Map<string, UnidadeMinhaEquipe[]>();

  for (const unidade of unidades) {
    if (!unidade.unidadePaiId) continue;

    const filhos = filhosPorPai.get(unidade.unidadePaiId) ?? [];
    filhos.push(unidade);
    filhosPorPai.set(unidade.unidadePaiId, filhos);
  }

  const resultado = new Set<string>([unidadeId]);
  const fila = [...(filhosPorPai.get(unidadeId) ?? [])];

  while (fila.length > 0) {
    const unidade = fila.shift()!;
    resultado.add(unidade.id);
    fila.push(...(filhosPorPai.get(unidade.id) ?? []));
  }

  return resultado;
}

function ordenarUnidadesParaArvore(unidades: UnidadeMinhaEquipe[]) {
  const ids = new Set(unidades.map((unidade) => unidade.id));
  const filhosPorPai = new Map<string | null, UnidadeMinhaEquipe[]>();

  for (const unidade of unidades) {
    const chave =
      unidade.unidadePaiId && ids.has(unidade.unidadePaiId)
        ? unidade.unidadePaiId
        : null;
    const filhos = filhosPorPai.get(chave) ?? [];
    filhos.push(unidade);
    filhosPorPai.set(chave, filhos);
  }

  for (const filhos of filhosPorPai.values()) {
    filhos.sort((a, b) =>
      `${a.sigla} ${a.nome}`.localeCompare(`${b.sigla} ${b.nome}`, "pt-BR", {
        sensitivity: "base",
      }),
    );
  }

  const ordenadas: UnidadeMinhaEquipe[] = [];
  const visitar = (paiId: string | null) => {
    for (const unidade of filhosPorPai.get(paiId) ?? []) {
      ordenadas.push(unidade);
      visitar(unidade.id);
    }
  };

  visitar(null);
  return ordenadas;
}

export function FeriasEquipeCalendario({
  dados,
  dataReferencia,
  unidadesSelecionadas,
  hrefAnoAnterior,
  hrefAnoAtual,
  hrefAnoSeguinte,
  actionPath = "/minha-equipe/ferias",
}: FeriasEquipeCalendarioProps) {
  const todosIdsUnidades = useMemo(
    () => dados.unidades.map((unidade) => unidade.id),
    [dados.unidades],
  );
  const idsSelecionadosIniciais =
    unidadesSelecionadas.length > 0 ? unidadesSelecionadas : todosIdsUnidades;
  const [mesAberto, setMesAberto] = useState<number | null>(null);
  const [buscaModal, setBuscaModal] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [unidadesFiltro, setUnidadesFiltro] = useState<string[]>(
    idsSelecionadosIniciais,
  );
  const unidadesSelecionadasFiltro = new Set(unidadesFiltro);
  const unidadesOrdenadas = useMemo(
    () => ordenarUnidadesParaArvore(dados.unidades),
    [dados.unidades],
  );
  const mesesComFerias = meses.map((mes, indice) => ({
    mes,
    indice,
    itens: feriasNoMes(dados.itens, dados.ano, indice),
  }));
  const mesSelecionado =
    mesAberto === null
      ? null
      : mesesComFerias.find((item) => item.indice === mesAberto);
  const buscaModalNormalizada = normalizarBusca(buscaModal);
  const itensModal = buscaModalNormalizada
    ? (mesSelecionado?.itens ?? []).filter((item) =>
        normalizarBusca(
          `${item.servidorNome} ${item.matricula} ${item.unidadeSigla} ${item.unidadeNome}`,
        ).includes(buscaModalNormalizada),
      )
    : (mesSelecionado?.itens ?? []);

  function aplicarFiltro() {
    if (unidadesFiltro.length === 0) return;

    const query = new URLSearchParams();
    query.set("data", dataReferencia);
    query.set("anoFerias", String(dados.ano));

    if (unidadesFiltro.length < todosIdsUnidades.length) {
      for (const unidadeId of unidadesFiltro) {
        query.append("unidadeId", unidadeId);
      }
    }

    window.location.href = `${actionPath}?${query.toString()}`;
  }

  function alternarUnidade(unidadeId: string) {
    const descendentes = idsDescendentes(dados.unidades, unidadeId);
    const todosMarcados = Array.from(descendentes).every((id) =>
      unidadesSelecionadasFiltro.has(id),
    );
    const proximo = new Set(unidadesFiltro);

    for (const id of descendentes) {
      if (todosMarcados) proximo.delete(id);
      else proximo.add(id);
    }

    setUnidadesFiltro(Array.from(proximo));
  }

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
              href={hrefAnoAnterior}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border transition hover:bg-muted"
              aria-label={`Ver férias de ${dados.ano - 1}`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={hrefAnoAtual}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold transition hover:bg-muted"
            >
              Ano atual
            </Link>
            <Link
              href={hrefAnoSeguinte}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border transition hover:bg-muted"
              aria-label={`Ver férias de ${dados.ano + 1}`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <form action={actionPath} className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => setFiltroAberto(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
          >
            <Filter className="size-4" aria-hidden="true" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Períodos de férias" valor={dados.resumo.periodos} />
        <ResumoCard label="Servidores com férias" valor={dados.resumo.servidores} />
        <ResumoCard
          label="Mês com maior concentração"
          valor={dados.resumo.mesMaisMovimentado}
          destaqueMenor
        />
        <ResumoCard
          label="Maior volume mensal"
          valor={dados.resumo.maiorQuantidadeMes}
        />
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
              {itens.slice(0, 5).map((item) => (
                <FeriasMesItem
                  key={`${mes}-${item.id}`}
                  item={item}
                  ano={dados.ano}
                  mes={indice}
                />
              ))}

              {itens.length > 5 && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaModal("");
                    setMesAberto(indice);
                  }}
                  className="rounded-md border border-dashed border-border p-2 text-center text-xs font-semibold text-muted-foreground transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-100"
                >
                  +{itens.length - 5} período(s) neste mês
                </button>
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

      {mesSelecionado && (
        <MesFeriasModal
          ano={dados.ano}
          mes={mesSelecionado}
          busca={buscaModal}
          itens={itensModal}
          onBuscaChange={setBuscaModal}
          onClose={() => setMesAberto(null)}
        />
      )}

      {filtroAberto && (
        <FiltroUnidadesModal
          unidades={unidadesOrdenadas}
          totalUnidades={todosIdsUnidades.length}
          selecionadas={unidadesSelecionadasFiltro}
          quantidadeSelecionada={unidadesFiltro.length}
          onAlternar={alternarUnidade}
          onMarcarTodos={() => setUnidadesFiltro(todosIdsUnidades)}
          onDesmarcarTodos={() => setUnidadesFiltro([])}
          onAplicar={aplicarFiltro}
          onClose={() => setFiltroAberto(false)}
        />
      )}
    </section>
  );
}

function ResumoCard({
  label,
  valor,
  destaqueMenor,
}: {
  label: string;
  valor: string | number;
  destaqueMenor?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-bold ${
          destaqueMenor ? "text-2xl capitalize" : "text-3xl"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function FeriasMesItem({
  item,
  ano,
  mes,
}: {
  item: FeriasEquipeItem;
  ano: number;
  mes: number;
}) {
  const estilo = estilosStatus[item.status];

  return (
    <div
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
          {formatarPeriodoNoMes(item, ano, mes)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`font-bold ${estilo.texto}`}>{item.statusLabel}</span>
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
}

function MesFeriasModal({
  ano,
  mes,
  busca,
  itens,
  onBuscaChange,
  onClose,
}: {
  ano: number;
  mes: { mes: string; indice: number; itens: FeriasEquipeItem[] };
  busca: string;
  itens: FeriasEquipeItem[];
  onBuscaChange: (valor: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              {mes.mes} de {ano}
            </p>
            <h3 className="mt-1 text-xl font-bold">Pessoas em férias</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="border-b border-border p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => onBuscaChange(event.target.value)}
              placeholder="Pesquisar pessoa, matrícula ou unidade"
              className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-2">
            {itens.map((item) => {
              const estilo = estilosStatus[item.status];

              return (
                <div
                  key={`modal-${item.id}`}
                  className={`rounded-md border-l-4 px-4 py-3 text-sm ${estilo.borda} ${estilo.fundo}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold">{item.servidorNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.matricula} · {item.unidadeSigla} · {item.unidadeNome}
                      </p>
                    </div>
                    <span className={`text-xs font-bold ${estilo.texto}`}>
                      {formatarPeriodoNoMes(item, ano, mes.indice)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-bold ${estilo.texto}`}>
                      {item.statusLabel}
                    </span>
                    <span className="text-muted-foreground">
                      Período completo: {formatarPeriodo(item)}
                    </span>
                    {item.exercicio && (
                      <span className="text-muted-foreground">
                        Exercício {item.exercicio}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {itens.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma pessoa encontrada para a pesquisa.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FiltroUnidadesModal({
  unidades,
  totalUnidades,
  selecionadas,
  quantidadeSelecionada,
  onAlternar,
  onMarcarTodos,
  onDesmarcarTodos,
  onAplicar,
  onClose,
}: {
  unidades: UnidadeMinhaEquipe[];
  totalUnidades: number;
  selecionadas: Set<string>;
  quantidadeSelecionada: number;
  onAlternar: (unidadeId: string) => void;
  onMarcarTodos: () => void;
  onDesmarcarTodos: () => void;
  onAplicar: () => void;
  onClose: () => void;
}) {
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const filhosPorPai = useMemo(() => {
    const mapa = new Map<string | null, UnidadeMinhaEquipe[]>();
    const ids = new Set(unidades.map((unidade) => unidade.id));

    for (const unidade of unidades) {
      const chave =
        unidade.unidadePaiId && ids.has(unidade.unidadePaiId)
          ? unidade.unidadePaiId
          : null;
      const filhos = mapa.get(chave) ?? [];
      filhos.push(unidade);
      mapa.set(chave, filhos);
    }

    return mapa;
  }, [unidades]);
  const idsComFilhos = useMemo(
    () =>
      new Set(
        Array.from(filhosPorPai.entries())
          .filter(([paiId, filhos]) => paiId && filhos.length > 0)
          .map(([paiId]) => paiId as string),
      ),
    [filhosPorPai],
  );
  const [expandidos, setExpandidos] = useState<Set<string>>(
    () => new Set(filhosPorPai.get(null)?.map((unidade) => unidade.id) ?? []),
  );
  const unidadesPorId = useMemo(
    () => new Map(unidades.map((unidade) => [unidade.id, unidade])),
    [unidades],
  );
  const buscaNormalizada = normalizarBusca(buscaUnidade);
  const unidadesVisiveis = useMemo(() => {
    if (buscaNormalizada) {
      const idsVisiveis = new Set<string>();

      for (const unidade of unidades) {
        const texto = normalizarBusca(`${unidade.sigla} ${unidade.nome}`);
        if (!texto.includes(buscaNormalizada)) continue;

        let atual: UnidadeMinhaEquipe | undefined = unidade;
        while (atual) {
          idsVisiveis.add(atual.id);
          atual = atual.unidadePaiId
            ? unidadesPorId.get(atual.unidadePaiId)
            : undefined;
        }
      }

      return unidades.filter((unidade) => idsVisiveis.has(unidade.id));
    }

    return unidades.filter((unidade) => {
      let paiId = unidade.unidadePaiId;
      while (paiId) {
        if (!expandidos.has(paiId)) return false;
        paiId = unidadesPorId.get(paiId)?.unidadePaiId ?? null;
      }

      return true;
    });
  }, [buscaNormalizada, expandidos, unidades, unidadesPorId]);

  function alternarExpansao(unidadeId: string) {
    setExpandidos((atuais) => {
      const proximo = new Set(atuais);
      if (proximo.has(unidadeId)) proximo.delete(unidadeId);
      else proximo.add(unidadeId);
      return proximo;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Filtro da equipe
            </p>
            <h3 className="mt-1 text-xl font-bold">Departamentos</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border transition hover:bg-muted"
            aria-label="Fechar filtro"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3 border-b border-border p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={buscaUnidade}
              onChange={(event) => setBuscaUnidade(event.target.value)}
              placeholder="Pesquisar departamento por sigla ou nome"
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {quantidadeSelecionada} de {totalUnidades} departamento(s)
              {buscaNormalizada ? ` · ${unidadesVisiveis.length} localizado(s)` : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExpandidos(new Set(idsComFilhos))}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-bold transition hover:bg-muted"
              >
                Expandir
              </button>
              <button
                type="button"
                onClick={() => setExpandidos(new Set())}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-bold transition hover:bg-muted"
              >
                Recolher
              </button>
              <button
                type="button"
                onClick={onMarcarTodos}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-bold transition hover:bg-muted"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={onDesmarcarTodos}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-bold transition hover:bg-muted"
              >
                Desmarcar todos
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-1">
            {unidadesVisiveis.map((unidade) => {
              const selecionado = selecionadas.has(unidade.id);
              const possuiFilhos = idsComFilhos.has(unidade.id);
              const expandido = expandidos.has(unidade.id) || Boolean(buscaNormalizada);

              return (
                <div
                  key={unidade.id}
                  className="grid grid-cols-[auto_auto_1fr] items-start gap-2 rounded-md py-2 pr-3 transition hover:bg-muted"
                  style={{ paddingLeft: `${12 + unidade.nivel * 18}px` }}
                >
                  <button
                    type="button"
                    onClick={() => alternarExpansao(unidade.id)}
                    disabled={!possuiFilhos || Boolean(buscaNormalizada)}
                    className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition hover:bg-background disabled:opacity-30"
                    aria-label={
                      expandido
                        ? `Recolher ${unidade.sigla}`
                        : `Expandir ${unidade.sigla}`
                    }
                  >
                    {possuiFilhos ? (
                      expandido ? (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4" aria-hidden="true" />
                      )
                    ) : (
                      <span className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlternar(unidade.id)}
                    className="inline-flex size-5 items-center justify-center rounded transition hover:bg-background"
                    aria-label={
                      selecionado
                        ? `Desmarcar ${unidade.sigla}`
                        : `Marcar ${unidade.sigla}`
                    }
                  >
                    {selecionado ? (
                      <CheckSquare className="size-4 text-blue-800 dark:text-blue-200" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlternar(unidade.id)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-sm font-bold">
                      {unidade.sigla}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {unidade.nome}
                    </span>
                  </button>
                </div>
              );
            })}
            {unidadesVisiveis.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum departamento encontrado para a pesquisa.
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-bold transition hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAplicar}
            disabled={quantidadeSelecionada === 0}
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
