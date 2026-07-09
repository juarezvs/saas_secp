"use client";

import { RefreshCw } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { CompetenciaInput } from "@/components/ui/competencia-input";
import {
  reprocessarMarcacoesBrutasEscopoAction,
  type ReprocessarMarcacoesBrutasEscopoState,
} from "@/modules/marcacoes-brutas/application/actions/reprocessar-marcacoes-brutas-escopo.action";

type OpcaoServidor = {
  id: string;
  matricula: string;
  nome: string;
};

type OpcaoUnidade = {
  id: string;
  label: string;
};

type OpcaoPesquisavel = {
  id: string;
  label: string;
  textoBusca: string;
};

const estadoInicial: ReprocessarMarcacoesBrutasEscopoState = {
  ok: null,
  mensagem: "Aguardando seleção do escopo.",
};

export function ReprocessarMarcacoesBrutasEscopoForm({
  servidores,
  unidades,
}: {
  servidores: OpcaoServidor[];
  unidades: OpcaoUnidade[];
}) {
  const [modo, setModo] = useState<"SERVIDOR" | "UNIDADE">("SERVIDOR");
  const [servidorId, setServidorId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [estado, formAction, pendente] = useActionState(
    reprocessarMarcacoesBrutasEscopoAction,
    estadoInicial,
  );
  const servidoresOpcoes = useMemo(
    () =>
      servidores.map((servidor) => ({
        id: servidor.id,
        label: `${servidor.matricula} - ${servidor.nome}`,
        textoBusca: `${servidor.matricula} ${servidor.nome}`.toLowerCase(),
      })),
    [servidores],
  );
  const unidadesOpcoes = useMemo(
    () =>
      unidades.map((unidade) => ({
        id: unidade.id,
        label: unidade.label,
        textoBusca: unidade.label.toLowerCase(),
      })),
    [unidades],
  );

  return (
    <form action={formAction} className="mt-5 rounded-lg border p-4">
      <div className="grid gap-4 lg:grid-cols-[160px_minmax(260px,1fr)_190px_auto] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Modo</span>
          <select
            name="modo"
            value={modo}
            disabled={pendente}
            onChange={(event) =>
              setModo(event.target.value as "SERVIDOR" | "UNIDADE")
            }
            className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm disabled:opacity-60"
          >
            <option value="SERVIDOR">Servidor</option>
            <option value="UNIDADE">Departamento</option>
          </select>
        </label>

        {modo === "SERVIDOR" ? (
          <CampoPesquisavel
            key="servidor"
            name="servidorId"
            label="Servidor"
            placeholder="Pesquisar por matrícula ou nome"
            opcoes={servidoresOpcoes}
            value={servidorId}
            onValueChange={setServidorId}
            disabled={pendente}
          />
        ) : (
          <CampoPesquisavel
            key="unidade"
            name="unidadeId"
            label="Departamento"
            placeholder="Pesquisar por sigla ou nome"
            opcoes={unidadesOpcoes}
            value={unidadeId}
            onValueChange={setUnidadeId}
            disabled={pendente}
          />
        )}

        <CompetenciaInput
          name="competencia"
          label="Competência"
          disabled={pendente}
        />

        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={pendente ? "animate-spin" : ""} />
          {pendente ? "Reprocessando..." : "Reprocessar escopo"}
        </button>
      </div>

      {modo === "UNIDADE" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            name="incluirSubunidades"
            defaultChecked
            className="h-4 w-4 rounded border"
          />
          Incluir departamentos subordinados
        </label>
      )}

      <div aria-live="polite" className="mt-3 text-sm">
        <p
          className={
            estado.ok === false
              ? "font-medium text-red-700"
              : estado.ok === true
                ? "font-medium text-green-700"
                : "text-[var(--muted-foreground)]"
          }
        >
          {estado.mensagem}
        </p>

        {estado.resultado && (
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {estado.resultado.servidoresAfetados} servidor(es),{" "}
            {estado.resultado.brutasEncontradas} marcação(ões) bruta(s),{" "}
            {estado.resultado.reprocessadas} reprocessada(s),{" "}
            {estado.resultado.competenciasRecalculadas} competência(s)
            recalculada(s), {estado.resultado.periodosHomologados} bloqueada(s)
            por homologação e {estado.resultado.erros} erro(s).
          </p>
        )}
      </div>
    </form>
  );
}

function CampoPesquisavel({
  name,
  label,
  placeholder,
  opcoes,
  value,
  onValueChange,
  disabled,
}: {
  name: string;
  label: string;
  placeholder: string;
  opcoes: OpcaoPesquisavel[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selecionada = opcoes.find((opcao) => opcao.id === value) ?? null;
  const [busca, setBusca] = useState(selecionada?.label ?? "");
  const [aberto, setAberto] = useState(false);
  const buscaNormalizada = busca.trim().toLowerCase();
  const opcoesFiltradas = useMemo(() => {
    if (!buscaNormalizada) {
      return opcoes.slice(0, 20);
    }

    return opcoes
      .filter((opcao) => opcao.textoBusca.includes(buscaNormalizada))
      .slice(0, 20);
  }, [buscaNormalizada, opcoes]);

  function selecionar(opcao: OpcaoPesquisavel) {
    onValueChange(opcao.id);
    setBusca(opcao.label);
    setAberto(false);
  }

  return (
    <div className="relative space-y-1 text-sm">
      <label className="font-semibold" htmlFor={`${name}-busca`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <input
        id={`${name}-busca`}
        type="search"
        value={busca}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onChange={(event) => {
          setBusca(event.target.value);
          onValueChange("");
          setAberto(true);
        }}
        className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm disabled:opacity-60"
      />

      {aberto && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-[var(--card)] p-1 shadow-lg">
          {opcoesFiltradas.length > 0 ? (
            opcoesFiltradas.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selecionar(opcao)}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                {opcao.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
              Nenhum resultado encontrado.
            </p>
          )}
        </div>
      )}

      {!value && busca.length > 0 && (
        <p className="text-xs text-amber-700">
          Selecione um item da lista para continuar.
        </p>
      )}
    </div>
  );
}
