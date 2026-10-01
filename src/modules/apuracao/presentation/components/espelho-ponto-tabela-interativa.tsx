"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Search,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

const opcoesPorPagina = [10, 20, 30, 50];

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function EspelhoPontoTabelaInterativa({
  children,
  totalRegistros,
  semanas,
  semanaInicial = 0,
  painelDias,
  painelSemana,
  painelTotais,
  painelOcorrencias,
  historicoAjustes,
  semana,
  totaisPorTipo,
  ocorrencias,
  totalRegistrosSemana = 0,
  totalRegistrosTotais = 0,
  totalRegistrosOcorrencias = 0,
  totalRegistrosHistorico = 0,
}: {
  children: ReactNode;
  totalRegistros: number;
  semanas?: Array<{
    label: string;
    painel: ReactNode;
    conteudo: ReactNode;
    totalRegistros: number;
  }>;
  semanaInicial?: number;
  painelDias?: ReactNode;
  painelSemana?: ReactNode;
  painelTotais?: ReactNode;
  painelOcorrencias?: ReactNode;
  historicoAjustes?: ReactNode;
  semana?: ReactNode;
  totaisPorTipo?: ReactNode;
  ocorrencias?: ReactNode;
  totalRegistrosSemana?: number;
  totalRegistrosTotais?: number;
  totalRegistrosOcorrencias?: number;
  totalRegistrosHistorico?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abaParam = searchParams.get("aba");
  const abaUrl =
    abaParam === "totais" ||
    abaParam === "semana" ||
    abaParam === "ocorrencias" ||
    abaParam === "historico"
      ? abaParam
      : "dias";
  const [abaAtiva, setAbaAtiva] = useState<
    "dias" | "semana" | "totais" | "ocorrencias" | "historico"
  >(abaUrl);
  const [busca, setBusca] = useState("");
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);
  const [totalFiltrado, setTotalFiltrado] = useState(totalRegistros);
  const [semanaAtiva, setSemanaAtiva] = useState(semanaInicial);
  const buscaNormalizada = useMemo(() => normalizarBusca(busca), [busca]);
  const exibindoSemana = abaAtiva === "semana";
  const semanaAtual = semanas?.[semanaAtiva];
  const exibindoTotais = abaAtiva === "totais";
  const exibindoOcorrencias = abaAtiva === "ocorrencias";
  const exibindoHistorico = abaAtiva === "historico";
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / itensPorPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio =
    totalFiltrado === 0 ? 0 : (paginaSegura - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaSegura * itensPorPagina, totalFiltrado);

  useEffect(() => {
    const painelDias = document.getElementById("espelho-painel-dias");

    if (!painelDias) {
      return;
    }

    painelDias.hidden =
      exibindoSemana ||
      exibindoTotais ||
      exibindoOcorrencias ||
      exibindoHistorico;

    return () => {
      painelDias.hidden = false;
    };
  }, [exibindoHistorico, exibindoOcorrencias, exibindoSemana, exibindoTotais]);

  useEffect(() => {
    const linhas = Array.from(
      containerRef.current?.querySelectorAll<HTMLTableRowElement>(
        "[data-espelho-row]",
      ) ?? [],
    );
    const linhasFiltradas = linhas.filter((linha) => {
      const texto = linha.dataset.search ?? "";

      return !buscaNormalizada || texto.includes(buscaNormalizada);
    });
    const paginaAtual = Math.min(
      Math.max(1, pagina),
      Math.max(1, Math.ceil(linhasFiltradas.length / itensPorPagina)),
    );
    const indiceInicial = (paginaAtual - 1) * itensPorPagina;
    const indiceFinal = indiceInicial + itensPorPagina;

    linhas.forEach((linha) => {
      linha.hidden = true;
    });

    linhasFiltradas.forEach((linha, indice) => {
      linha.hidden = indice < indiceInicial || indice >= indiceFinal;
    });

    setTotalFiltrado(
      linhas.length > 0
        ? linhasFiltradas.length
        : exibindoSemana
          ? (semanaAtual?.totalRegistros ?? totalRegistrosSemana)
          : exibindoTotais
            ? totalRegistrosTotais
            : exibindoOcorrencias
              ? totalRegistrosOcorrencias
              : exibindoHistorico
                ? totalRegistrosHistorico
                : totalRegistros,
    );
  }, [
    exibindoHistorico,
    buscaNormalizada,
    exibindoOcorrencias,
    exibindoSemana,
    exibindoTotais,
    itensPorPagina,
    pagina,
    totalRegistros,
    totalRegistrosHistorico,
    totalRegistrosOcorrencias,
    semanaAtual?.totalRegistros,
    totalRegistrosSemana,
    totalRegistrosTotais,
  ]);

  function irParaPagina(proximaPagina: number) {
    setPagina(Math.min(Math.max(1, proximaPagina), totalPaginas));
  }

  function trocarAba(
    aba: "dias" | "semana" | "totais" | "ocorrencias" | "historico",
  ) {
    const query = new URLSearchParams(searchParams.toString());

    if (aba === "dias") {
      query.delete("aba");
    } else {
      query.set("aba", aba);
    }

    const queryString = query.toString();
    const destino = queryString ? `${pathname}?${queryString}` : pathname;

    setAbaAtiva(aba);
    setBusca("");
    setPagina(1);
    router.replace(destino, { scroll: false });
  }

  const primeiraPagina = Math.max(
    1,
    Math.min(paginaSegura - 1, totalPaginas - 2),
  );
  const paginas = Array.from(
    { length: Math.min(3, totalPaginas) },
    (_, indice) => primeiraPagina + indice,
  );
  const abas = [
    { id: "dias", label: "Dias do mês", habilitada: true, icon: CalendarDays },
    {
      id: "semana",
      label: "Visualização por semana",
      habilitada: Boolean(semana || semanas?.length),
      icon: CalendarRange,
    },
    {
      id: "totais",
      label: "Totais por tipo",
      habilitada: Boolean(totaisPorTipo),
      icon: SlidersHorizontal,
    },
    {
      id: "ocorrencias",
      label: "Visualização por ocorrências",
      habilitada: Boolean(ocorrencias),
      icon: Workflow,
    },
    {
      id: "historico",
      label: "Histórico de ajustes",
      habilitada: Boolean(historicoAjustes),
      icon: History,
    },
  ] as const;

  return (
    <>
      {exibindoSemana
        ? (semanaAtual?.painel ?? painelSemana)
        : exibindoTotais
          ? painelTotais
          : exibindoOcorrencias
            ? painelOcorrencias
            : exibindoHistorico
              ? null
              : painelDias}

      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {abas.map((aba) => {
            const Icon = aba.icon;

            return (
              <button
                key={aba.id}
                type="button"
                disabled={!aba.habilitada}
                onClick={() => {
                  if (
                    aba.id === "dias" ||
                    aba.id === "semana" ||
                    aba.id === "totais" ||
                    aba.id === "ocorrencias" ||
                    aba.id === "historico"
                  ) {
                    trocarAba(aba.id);
                  }
                }}
                className={`inline-flex h-9 shrink-0 items-center gap-2 border-b-4 px-3 text-xs ${
                  abaAtiva === aba.id
                    ? "border-blue-600 font-black text-blue-700 dark:text-blue-300"
                    : "border-transparent font-semibold text-slate-600 dark:text-slate-300 disabled:cursor-default"
                } disabled:opacity-70`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {aba.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exibindoSemana && semanas && semanas.length > 0 ? (
            <div className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1 text-xs font-bold text-blue-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-blue-100">
              <button
                type="button"
                disabled={semanaAtiva <= 0}
                onClick={() => {
                  setSemanaAtiva((valor) => Math.max(0, valor - 1));
                  setPagina(1);
                }}
                className="grid size-6 place-items-center rounded text-blue-700 disabled:text-slate-300"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="min-w-48 text-center">
                Semana {semanaAtiva + 1}: {semanaAtual?.label}
              </span>
              <button
                type="button"
                disabled={semanaAtiva >= semanas.length - 1}
                onClick={() => {
                  setSemanaAtiva((valor) =>
                    Math.min(semanas.length - 1, valor + 1),
                  );
                  setPagina(1);
                }}
                className="grid size-6 place-items-center rounded text-blue-700 disabled:text-slate-300"
                aria-label="Próxima semana"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <label className="flex h-8 min-w-[230px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setPagina(1);
              }}
              placeholder={
                exibindoTotais
                  ? "Buscar tipo de hora..."
                  : exibindoSemana
                    ? "Buscar dia da semana..."
                    : exibindoOcorrencias
                      ? "Buscar ocorrência..."
                      : exibindoHistorico
                        ? "Buscar ajuste..."
                        : "Buscar dia ou ocorrência..."
              }
              className="h-full min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <Filter className="size-4" aria-hidden="true" />
            Filtros
          </button>
        </div>
      </div>

      <div ref={containerRef}>
        {exibindoSemana
          ? (semanaAtual?.conteudo ?? semana)
          : exibindoTotais
            ? totaisPorTipo
            : exibindoOcorrencias
              ? ocorrencias
              : exibindoHistorico
                ? historicoAjustes
                : children}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between dark:border-slate-800">
        <span>
          {totalFiltrado > 0
            ? `Mostrando ${inicio} a ${fim} de ${totalFiltrado} registros`
            : "Mostrando 0 registros"}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={itensPorPagina}
            onChange={(event) => {
              setItensPorPagina(Number(event.target.value));
              setPagina(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 font-semibold text-slate-700 shadow-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Itens por página"
          >
            {opcoesPorPagina.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao} por página
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={paginaSegura <= 1}
            onClick={() => irParaPagina(paginaSegura - 1)}
            className="rounded-md border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:pointer-events-none disabled:text-slate-400 dark:border-slate-800 dark:text-slate-200"
          >
            &lt;
          </button>
          {paginas.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => irParaPagina(item)}
              className={
                item === paginaSegura
                  ? "rounded-md bg-blue-600 px-3 py-2 font-bold text-white shadow-sm"
                  : "rounded-md border border-slate-200 px-3 py-2 font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
              }
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            disabled={paginaSegura >= totalPaginas}
            onClick={() => irParaPagina(paginaSegura + 1)}
            className="rounded-md border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:pointer-events-none disabled:text-slate-400 dark:border-slate-800 dark:text-slate-200"
          >
            &gt;
          </button>
        </div>
      </div>
    </>
  );
}
