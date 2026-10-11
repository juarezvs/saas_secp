"use client";

import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { Button, Modal } from "@/components/ui";

type OrgaosListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
  permitirNovo?: boolean;
  fusosHorarios?: {
    valor: string;
    rotulo: string;
  }[];
};

const NOMES_FILTROS = [
  "busca",
  "sigla",
  "nome",
  "codigoExternoSarh",
  "status",
  "fusoHorario",
] as const;

export function OrgaosListagemControles({
  exportCsvHref,
  exportPdfHref,
  permitirNovo = false,
  fusosHorarios = [],
}: OrgaosListagemControlesProps) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quantidadeFiltros = useMemo(
    () => NOMES_FILTROS.filter((nome) => searchParams.get(nome)?.trim()).length,
    [searchParams],
  );
  const filtrosAtivos = useMemo(
    () =>
      NOMES_FILTROS.flatMap((nome) => {
        const valor = searchParams.get(nome)?.trim();
        return valor ? [{ nome, valor }] : [];
      }),
    [searchParams],
  );

  function navegarComFiltros(params: URLSearchParams) {
    params.set("pagina", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      setAberto(false);
    });
  }

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    for (const nome of NOMES_FILTROS) {
      const valor = String(formData.get(nome) ?? "").trim();
      if (valor) params.set(nome, valor);
      else params.delete(nome);
    }

    navegarComFiltros(params);
  }

  function limparFiltros() {
    const params = new URLSearchParams(searchParams.toString());
    for (const nome of NOMES_FILTROS) params.delete(nome);
    navegarComFiltros(params);
  }

  function removerFiltro(nome: (typeof NOMES_FILTROS)[number]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(nome);
    navegarComFiltros(params);
  }

  function atualizarLista() {
    startTransition(() => router.refresh());
  }

  const rotulosFiltros: Record<(typeof NOMES_FILTROS)[number], string> = {
    busca: "Pesquisa",
    sigla: "Sigla",
    nome: "Nome",
    codigoExternoSarh: "Código SARH",
    status: "Status",
    fusoHorario: "Fuso horário",
  };

  return (
    <>
      <div className="w-full">
        <div className="flex min-h-10 flex-wrap items-center gap-1 border-y border-[var(--border)] px-2 py-1">
          {permitirNovo && (
            <Link
              href="/orgaos/novo"
              className="secp-theme-primary-action inline-flex h-8 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium"
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo órgão
            </Link>
          )}
          <button
            type="button"
            onClick={atualizarLista}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)] disabled:opacity-60"
          >
            <RefreshCw
              className={`size-4 ${pending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Atualizar
          </button>
          <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
          <DataTableExportButtons
            csvHref={exportCsvHref}
            pdfHref={exportPdfHref}
            variant="command"
          />
          <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
          <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)]"
          aria-label={
            quantidadeFiltros
              ? `Filtros, ${quantidadeFiltros} ativos`
              : "Abrir filtros"
          }
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
          {quantidadeFiltros > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-[var(--primary-foreground)]">
              {quantidadeFiltros}
            </span>
          )}
          </button>
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
            <SlidersHorizontal className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
            {filtrosAtivos.map((filtro) => (
              <button
                key={filtro.nome}
                type="button"
                onClick={() => removerFiltro(filtro.nome)}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--muted)]/50 px-2 text-xs transition hover:bg-[var(--muted)]"
                title={`Remover filtro ${rotulosFiltros[filtro.nome]}`}
              >
                <span className="font-medium">{rotulosFiltros[filtro.nome]}:</span>
                <span className="max-w-48 truncate">{filtro.valor}</span>
                <X className="size-3" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={limparFiltros}
              className="h-7 px-2 text-xs font-medium text-[var(--secp-theme-accent)] hover:underline"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Filtros"
        description="Refine a lista de órgãos pelos critérios desejados."
        className="max-h-[88vh] w-[min(94vw,720px)] overflow-y-auto"
      >
        <form onSubmit={aplicarFiltros}>
          <Secao titulo="Identificação">
            <CampoTexto
              nome="busca"
              label="Consulta geral"
              valor={searchParams.get("busca") ?? ""}
              placeholder="Nome, sigla ou código SARH"
              className="sm:col-span-2"
            />
            <CampoTexto
              nome="sigla"
              label="Sigla"
              valor={searchParams.get("sigla") ?? ""}
            />
            <CampoTexto
              nome="nome"
              label="Nome"
              valor={searchParams.get("nome") ?? ""}
            />
            <CampoTexto
              nome="codigoExternoSarh"
              label="Código SARH"
              valor={searchParams.get("codigoExternoSarh") ?? ""}
              className="sm:col-span-2"
            />
          </Secao>

          <Secao titulo="Situação e localização" separada>
            <CampoSelect
              nome="status"
              label="Status"
              valor={searchParams.get("status") ?? ""}
              opcoes={[
                { value: "", label: "Todos" },
                { value: "ativo", label: "Ativos" },
                { value: "inativo", label: "Inativos" },
              ]}
            />
            <CampoSelect
              nome="fusoHorario"
              label="Fuso horário"
              valor={searchParams.get("fusoHorario") ?? ""}
              opcoes={[
                { value: "", label: "Todos" },
                ...fusosHorarios.map((fuso) => ({
                  value: fuso.valor,
                  label: fuso.rotulo,
                })),
              ]}
            />
          </Secao>

          <div className="sticky -bottom-6 mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card)] py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={limparFiltros}
              disabled={pending || quantidadeFiltros === 0}
            >
              Limpar filtros
            </Button>
            <Button type="submit" loading={pending}>
              Aplicar filtros
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const inputClassName =
  "mt-2 h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition-colors focus:border-[var(--ring)]";

function Secao({
  titulo,
  separada = false,
  children,
}: {
  titulo: string;
  separada?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        separada ? "mt-6 border-t border-[var(--border)] pt-5" : undefined
      }
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {titulo}
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CampoTexto({
  nome,
  label,
  valor,
  placeholder,
  className,
}: {
  nome: string;
  label: string;
  valor: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        key={`${nome}-${valor}`}
        name={nome}
        defaultValue={valor}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );
}

function CampoSelect({
  nome,
  label,
  valor,
  opcoes,
}: {
  nome: string;
  label: string;
  valor: string;
  opcoes: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <select
        key={`${nome}-${valor}`}
        name={nome}
        defaultValue={valor}
        className={inputClassName}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.value || "todos"} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </label>
  );
}
