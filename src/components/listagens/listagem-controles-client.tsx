"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type OpcaoFiltro = {
  label: string;
  value: string;
  tipo?: "texto" | "select";
  opcoes?: {
    label: string;
    value: string;
  }[];
};

export function ListagemControlesClient({
  filtros,
  itensPorPaginaAtual,
}: {
  filtros: OpcaoFiltro[];
  itensPorPaginaAtual: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const buscaAtual = searchParams.get("busca") ?? "";
  const colunaAtual = searchParams.get("filtroColuna") ?? "";
  const valorAtual = searchParams.get("filtroValor") ?? "";

  const [busca, setBusca] = useState(buscaAtual);
  const [filtroColuna, setFiltroColuna] = useState(colunaAtual);
  const [filtroValor, setFiltroValor] = useState(valorAtual);

  const filtroSelecionado = useMemo(
    () => filtros.find((item) => item.value === filtroColuna),
    [filtros, filtroColuna],
  );

  function atualizarUrl(params: {
    busca?: string;
    filtroColuna?: string;
    filtroValor?: string;
    itensPorPagina?: string;
  }) {
    const query = new URLSearchParams(searchParams.toString());

    if (params.busca !== undefined) {
      if (params.busca.trim()) query.set("busca", params.busca.trim());
      else query.delete("busca");
    }

    if (params.filtroColuna !== undefined) {
      if (params.filtroColuna) query.set("filtroColuna", params.filtroColuna);
      else query.delete("filtroColuna");
    }

    if (params.filtroValor !== undefined) {
      if (params.filtroValor.trim())
        query.set("filtroValor", params.filtroValor.trim());
      else query.delete("filtroValor");
    }

    if (params.itensPorPagina !== undefined) {
      query.set("itensPorPagina", params.itensPorPagina);
    }

    query.set("pagina", "1");

    startTransition(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      atualizarUrl({ busca });
    }, 3000);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <div className="grid gap-4 border-b p-5 lg:grid-cols-[minmax(260px,1fr)_220px_260px]">
      <div>
        <label htmlFor="busca" className="text-sm font-semibold">
          Consulta geral
        </label>

        <div className="mt-2 flex h-10 items-center gap-2 rounded-md border px-3">
          <Search className="size-4 text-[var(--muted-foreground)]" />
          <input
            id="busca"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar nos campos da tabela..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          A consulta será aplicada automaticamente após 3 segundos.
        </p>
      </div>

      <div>
        <label htmlFor="filtroColuna" className="text-sm font-semibold">
          Filtrar coluna
        </label>

        <select
          id="filtroColuna"
          value={filtroColuna}
          onChange={(event) => {
            const novaColuna = event.target.value;
            setFiltroColuna(novaColuna);
            setFiltroValor("");
            atualizarUrl({
              filtroColuna: novaColuna,
              filtroValor: "",
            });
          }}
          className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
        >
          <option value="">Nenhum filtro</option>
          {filtros.map((filtro) => (
            <option key={filtro.value} value={filtro.value}>
              {filtro.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filtroValor" className="text-sm font-semibold">
          Valor do filtro
        </label>

        {filtroSelecionado?.tipo === "select" ? (
          <select
            id="filtroValor"
            value={filtroValor}
            onChange={(event) => {
              setFiltroValor(event.target.value);
              atualizarUrl({
                filtroColuna,
                filtroValor: event.target.value,
              });
            }}
            disabled={!filtroColuna}
            className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:opacity-50"
          >
            <option value="">Todos</option>
            {filtroSelecionado.opcoes?.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="filtroValor"
            value={filtroValor}
            onChange={(event) => {
              setFiltroValor(event.target.value);
              atualizarUrl({
                filtroColuna,
                filtroValor: event.target.value,
              });
            }}
            disabled={!filtroColuna}
            placeholder="Informe o valor"
            className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:opacity-50"
          />
        )}
      </div>

      <div className="hidden">
        <select
          value={String(itensPorPaginaAtual)}
          onChange={(event) =>
            atualizarUrl({
              itensPorPagina: event.target.value,
            })
          }
        />
      </div>
    </div>
  );
}

export function ItensPorPaginaSelect({ valorAtual }: { valorAtual: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={String(valorAtual)}
      onChange={(event) => {
        const query = new URLSearchParams(searchParams.toString());
        query.set("itensPorPagina", event.target.value);
        query.set("pagina", "1");
        router.push(`${pathname}?${query.toString()}`);
      }}
      className="h-9 rounded-md border bg-(--card) px-2 text-sm"
    >
      <option value="05">05 por página</option>
      <option value="10">10 por página</option>
      <option value="20">20 por página</option>
      <option value="50">50 por página</option>
      <option value="100">100 por página</option>
    </select>
  );
}
