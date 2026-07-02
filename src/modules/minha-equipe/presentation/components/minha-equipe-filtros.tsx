"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { UnidadeMinhaEquipe } from "../../infrastructure/repositories/minha-equipe.repository";

type MinhaEquipeFiltrosProps = {
  data: string;
  escopo: "chefia" | "global";
  resumo: {
    total: number;
    presentes: number;
    ausentes: number;
    afastados: number;
  };
  unidades: UnidadeMinhaEquipe[];
  unidadesSelecionadas: string[];
};

export function MinhaEquipeFiltros({
  data,
  escopo,
  resumo,
  unidades,
  unidadesSelecionadas,
}: MinhaEquipeFiltrosProps) {
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState(
    () => new Set(unidadesSelecionadas),
  );
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const unidadesFiltradas = useMemo(() => {
    if (!termo) return unidades;

    return unidades.filter((unidade) =>
      `${unidade.sigla} ${unidade.nome}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo),
    );
  }, [termo, unidades]);
  const quantidadeSelecionada = selecionadas.size;
  const resumoSelecao =
    quantidadeSelecionada > 0
      ? `${quantidadeSelecionada} departamento${
          quantidadeSelecionada === 1 ? "" : "s"
        } selecionado${quantidadeSelecionada === 1 ? "" : "s"}`
      : escopo === "global"
        ? `Todas as equipes (${unidades.length})`
        : `Toda a equipe subordinada (${unidades.length})`;
  const percentualPresentes =
    resumo.total > 0 ? (resumo.presentes / resumo.total) * 100 : 0;
  const percentualAusentes =
    resumo.total > 0 ? (resumo.ausentes / resumo.total) * 100 : 0;
  const percentualAfastados =
    resumo.total > 0 ? (resumo.afastados / resumo.total) * 100 : 0;
  const inicioAusentes = percentualPresentes;
  const inicioAfastados = percentualPresentes + percentualAusentes;
  const pizzaStyle = {
    background:
      resumo.total > 0
        ? `conic-gradient(#22c55e 0% ${percentualPresentes}%, #ef4444 ${inicioAusentes}% ${inicioAfastados}%, #f97316 ${inicioAfastados}% 100%)`
        : "#e5e7eb",
  };

  function formatarPercentual(valor: number) {
    return `${valor.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}%`;
  }

  function alternarUnidade(unidadeId: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);

      if (proximo.has(unidadeId)) {
        proximo.delete(unidadeId);
      } else {
        proximo.add(unidadeId);
      }

      return proximo;
    });
  }

  function selecionarVisiveis() {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);

      for (const unidade of unidadesFiltradas) {
        proximo.add(unidade.id);
      }

      return proximo;
    });
  }

  return (
    <form
      action="/minha-equipe"
      className="rounded-md border border-border bg-card p-5 shadow-card"
    >
      {Array.from(selecionadas).map((unidadeId) => (
        <input
          key={unidadeId}
          type="hidden"
          name="unidadeId"
          value={unidadeId}
        />
      ))}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid gap-2">
            <label htmlFor="data" className="text-sm font-semibold">
              Data de referência
            </label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={data}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
            <div
              className="relative size-16 shrink-0 rounded-full"
              style={pizzaStyle}
              aria-label="Percentual de presenca da equipe"
            >
              <div className="absolute inset-3 rounded-full bg-background" />
            </div>
            <div className="grid gap-1 text-xs">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-green-500" />
                Presentes {formatarPercentual(percentualPresentes)}
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-red-500" />
                Ausentes {formatarPercentual(percentualAusentes)}
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-orange-500" />
                Licenças {formatarPercentual(percentualAfastados)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Search className="size-4" aria-hidden="true" />
            Atualizar
          </button>
          <a
            href="/minha-equipe"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold transition hover:bg-muted"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Hoje
          </a>
        </div>
      </div>

      {unidades.length > 0 && (
        <details className="mt-5 border-t border-border pt-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-2 py-2 text-sm font-semibold transition hover:bg-muted/70 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <Filter className="size-4" aria-hidden="true" />
              Departamentos
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {resumoSelecao}
            </span>
          </summary>

          <div className="mt-3 grid gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por sigla ou nome"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selecionarVisiveis}
                  className="h-9 rounded-md border border-border px-3 text-xs font-semibold transition hover:bg-muted"
                >
                  Selecionar visíveis
                </button>
                <button
                  type="button"
                  onClick={() => setSelecionadas(new Set())}
                  className="h-9 rounded-md border border-border px-3 text-xs font-semibold transition hover:bg-muted"
                >
                  Ver todos
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{unidadesFiltradas.length} departamento(s) na busca</span>
              <span aria-hidden="true">·</span>
              <span>Nenhuma seleção exibe todos do escopo atual</span>
            </div>

            <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {unidadesFiltradas.map((unidade) => (
                <label
                  key={unidade.id}
                  className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={selecionadas.has(unidade.id)}
                    onChange={() => alternarUnidade(unidade.id)}
                    className="mt-1 size-4 rounded border-border text-blue-900 focus:ring-ring"
                  />
                  <span
                    className="min-w-0"
                    style={{
                      paddingLeft: `${Math.min(unidade.nivel, 4) * 12}px`,
                    }}
                  >
                    <span className="block truncate font-semibold">
                      {unidade.sigla}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {unidade.nome}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </details>
      )}
    </form>
  );
}
