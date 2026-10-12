"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  History,
  Search,
  SlidersHorizontal,
  Workflow,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Modal } from "@/components/ui";

const opcoesPorPagina = [10, 20, 30, 50];
const paginationButtonClass =
  "grid size-8 place-items-center rounded-sm border border-transparent text-xs font-medium transition hover:bg-[var(--muted)] disabled:pointer-events-none disabled:opacity-40";

function placeholderBusca(
  aba: "dias" | "semana" | "totais" | "ocorrencias" | "historico",
) {
  if (aba === "totais") return "Buscar tipo de hora...";
  if (aba === "semana") return "Buscar dia da semana...";
  if (aba === "ocorrencias") return "Buscar ocorrência...";
  if (aba === "historico") return "Buscar ajuste...";
  return "Buscar dia ou ocorrência...";
}

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
  const [buscaRascunho, setBuscaRascunho] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);
  const [totalFiltrado, setTotalFiltrado] = useState(totalRegistros);
  const [semanaAtiva, setSemanaAtiva] = useState(semanaInicial);
  const [painelLateral, setPainelLateral] = useState<HTMLElement | null>(null);
  const buscaNormalizada = useMemo(() => normalizarBusca(busca), [busca]);
  const exibindoDias = abaAtiva === "dias";
  const exibindoSemana = abaAtiva === "semana";
  const semanaAtual = semanas?.[semanaAtiva];
  const exibindoTotais = abaAtiva === "totais";
  const exibindoOcorrencias = abaAtiva === "ocorrencias";
  const exibindoHistorico = abaAtiva === "historico";
  const itensEfetivos = exibindoDias
    ? Math.max(totalRegistros, totalFiltrado, 1)
    : itensPorPagina;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / itensEfetivos));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio =
    totalFiltrado === 0 ? 0 : (paginaSegura - 1) * itensEfetivos + 1;
  const fim = Math.min(paginaSegura * itensEfetivos, totalFiltrado);

  const conteudoPainelLateral = exibindoSemana
    ? (semanaAtual?.painel ?? painelSemana)
    : exibindoTotais
      ? painelTotais
      : exibindoOcorrencias
        ? painelOcorrencias
        : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPainelLateral(document.getElementById("espelho-painel-lateral-abas"));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const painelDiasElement = document.getElementById("espelho-painel-dias");
    const painelAbasElement = document.getElementById(
      "espelho-painel-lateral-abas",
    );

    if (painelDiasElement) {
      painelDiasElement.hidden = abaAtiva !== "dias";
    }

    if (painelAbasElement) {
      painelAbasElement.hidden = !conteudoPainelLateral;
    }
  }, [abaAtiva, conteudoPainelLateral]);

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
      Math.max(1, Math.ceil(linhasFiltradas.length / itensEfetivos)),
    );
    const indiceInicial = (paginaAtual - 1) * itensEfetivos;
    const indiceFinal = indiceInicial + itensEfetivos;

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
    exibindoDias,
    buscaNormalizada,
    exibindoOcorrencias,
    exibindoSemana,
    exibindoTotais,
    itensEfetivos,
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
    setBuscaRascunho("");
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
      {painelLateral && conteudoPainelLateral
        ? createPortal(conteudoPainelLateral, painelLateral)
        : null}

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-2 pt-1">
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
                className={`inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-xs transition ${
                  abaAtiva === aba.id
                    ? "border-[var(--secp-theme-accent)] font-semibold text-[var(--secp-theme-accent)]"
                    : "border-transparent font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)] disabled:cursor-default"
                } disabled:opacity-70`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {aba.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-10 flex-wrap items-center gap-1 border-b border-[var(--border)] px-2 py-1">
          {exibindoSemana && semanas && semanas.length > 0 ? (
            <div className="mr-1 flex h-8 items-center gap-1 border-r border-[var(--border)] pr-2 text-xs font-medium">
              <button
                type="button"
                disabled={semanaAtiva <= 0}
                onClick={() => {
                  setSemanaAtiva((valor) => Math.max(0, valor - 1));
                  setPagina(1);
                }}
                className="grid size-7 place-items-center rounded-sm text-[var(--secp-theme-accent)] hover:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="min-w-48 text-center text-[var(--foreground)]">
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
                className="grid size-7 place-items-center rounded-sm text-[var(--secp-theme-accent)] hover:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
                aria-label="Próxima semana"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setBuscaRascunho(busca);
              setFiltrosAbertos(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)]"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {busca ? (
              <span className="grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                1
              </span>
            ) : null}
          </button>

          <span className="ml-1 text-xs text-[var(--muted-foreground)]">
            {totalFiltrado > 0
              ? `${inicio}-${fim} de ${totalFiltrado}`
              : "0 registros"}
          </span>

          {!exibindoDias ? (
          <div className="ml-auto flex items-center gap-0.5">
            <select
              value={itensPorPagina}
              onChange={(event) => {
                setItensPorPagina(Number(event.target.value));
                setPagina(1);
              }}
              className="mr-1 h-8 rounded-sm border border-transparent bg-transparent px-2 text-xs font-medium outline-none hover:bg-[var(--muted)] focus:border-[var(--secp-theme-accent)]"
              aria-label="Itens por página"
            >
              {opcoesPorPagina.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao} por página
                </option>
              ))}
            </select>
            <button type="button" disabled={paginaSegura <= 1} onClick={() => irParaPagina(1)} className={paginationButtonClass} aria-label="Primeira página" title="Primeira página">
              <ChevronsLeft className="size-4" />
            </button>
            <button type="button" disabled={paginaSegura <= 1} onClick={() => irParaPagina(paginaSegura - 1)} className={paginationButtonClass} aria-label="Página anterior">
              <ChevronLeft className="size-4" />
            </button>
            {paginas.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => irParaPagina(item)}
                className={`${paginationButtonClass} ${
                  item === paginaSegura
                    ? "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]"
                    : ""
                }`}
                aria-current={item === paginaSegura ? "page" : undefined}
              >
                {item}
              </button>
            ))}
            <button type="button" disabled={paginaSegura >= totalPaginas} onClick={() => irParaPagina(paginaSegura + 1)} className={paginationButtonClass} aria-label="Próxima página">
              <ChevronRight className="size-4" />
            </button>
            <button type="button" disabled={paginaSegura >= totalPaginas} onClick={() => irParaPagina(totalPaginas)} className={paginationButtonClass} aria-label="Última página" title="Última página">
              <ChevronsRight className="size-4" />
            </button>
          </div>
          ) : null}
        </div>

      {busca ? (
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
          <Filter className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setBuscaRascunho("");
              setPagina(1);
            }}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--muted)]/50 px-2 text-xs hover:bg-[var(--muted)]"
          >
            <b>Pesquisa:</b>
            <span className="max-w-64 truncate">{busca}</span>
            <X className="size-3" aria-hidden="true" />
          </button>
        </div>
      ) : null}

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

      <Modal
        open={filtrosAbertos}
        onOpenChange={setFiltrosAbertos}
        title="Filtros do espelho"
        description="Localize registros na visualização ativa."
        className="w-[min(94vw,34rem)]"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setBusca(buscaRascunho.trim());
            setPagina(1);
            setFiltrosAbertos(false);
          }}
        >
          <label className="text-sm font-medium text-[var(--foreground)]">
            Pesquisa
            <span className="mt-2 flex h-10 items-center gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 focus-within:border-[var(--secp-theme-accent)]">
              <Search className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={buscaRascunho}
                onChange={(event) => setBuscaRascunho(event.target.value)}
                placeholder={placeholderBusca(abaAtiva)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
          <div className="mt-6 flex justify-between border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBusca("");
                setBuscaRascunho("");
                setPagina(1);
                setFiltrosAbertos(false);
              }}
              disabled={!busca && !buscaRascunho}
            >
              Limpar filtro
            </Button>
            <Button type="submit">Aplicar filtro</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
