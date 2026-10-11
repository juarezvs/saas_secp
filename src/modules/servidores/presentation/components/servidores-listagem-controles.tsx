"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, SlidersHorizontal } from "lucide-react";

import { DataTableToolbar, type DataTableFiltro } from "@/components/listagens";
import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { Modal } from "@/components/ui";

type OrgaoOption = {
  id: string;
  sigla: string;
};

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type ServidoresListagemControlesProps = {
  orgaos: OrgaoOption[];
  servidores: FiltroOption[];
  lotacoes: FiltroOption[];
  categorias?: FiltroOption[];
  tipoUsuarioFixo?: string;
  exportCsvHref?: string;
  exportPdfHref?: string;
  permitirNovo?: boolean;
  novoHref?: string;
  novoLabel?: string;
  acoesComplementares?: ReactNode;
  acoesDireita?: ReactNode;
};

const rotulosPessoa: Record<string, { singular: string; plural: string }> = {
  SERVIDOR: { singular: "Servidor", plural: "Servidores" },
  ESTAGIARIO: { singular: "Estagiário", plural: "Estagiários" },
  PRESTADOR: { singular: "Prestador", plural: "Prestadores" },
  VOLUNTARIO: { singular: "Voluntário", plural: "Voluntários" },
};

export function ServidoresListagemControles({
  orgaos,
  servidores,
  lotacoes,
  categorias = [],
  tipoUsuarioFixo,
  exportCsvHref,
  exportPdfHref,
  permitirNovo = false,
  novoHref = "/servidores/novo",
  novoLabel = "Novo servidor",
  acoesComplementares,
  acoesDireita,
}: ServidoresListagemControlesProps) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rotuloPessoa =
    rotulosPessoa[tipoUsuarioFixo ?? "SERVIDOR"] ?? rotulosPessoa.SERVIDOR;
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matrícula" },
    { tipo: "texto", nome: "cpf", label: "CPF" },
    { tipo: "texto", nome: "pis", label: "PIS/PASEP" },
    {
      tipo: "searchable-select",
      nome: "nome",
      label: tipoUsuarioFixo ? rotuloPessoa.singular : "Pessoa",
      placeholder: "Todos",
      searchPlaceholder: tipoUsuarioFixo
        ? `Pesquisar ${rotuloPessoa.singular.toLowerCase()}...`
        : "Pesquisar pessoa...",
      options: [{ value: "", label: "Todos" }, ...servidores],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "lotacao",
      label: "Lotação",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar lotação...",
      options: [{ value: "", label: "Todas" }, ...lotacoes],
    },
    {
      tipo: "searchable-select",
      nome: "categoriaPessoaId",
      label: "Categoria",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar categoria...",
      options: [{ value: "", label: "Todas" }, ...categorias],
    },
    ...(tipoUsuarioFixo
      ? []
      : [
          {
            tipo: "select" as const,
            nome: "tipoUsuario",
            label: "Tipo",
            options: [
              { value: "", label: "Todas as pessoas" },
              { value: "SERVIDOR", label: "Servidores" },
              { value: "ESTAGIARIO", label: "Estagiários" },
              { value: "PRESTADOR", label: "Prestadores" },
              { value: "VOLUNTARIO", label: "Voluntários" },
            ],
          },
        ]),
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Órgão",
      options: [
        { value: "", label: "Todos" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
      ],
    },
    ...(tipoUsuarioFixo
      ? []
      : [
          {
            tipo: "select" as const,
            nome: "vinculo",
            label: "Vínculo",
            options: [
              { value: "", label: "Todos" },
              { value: "EFETIVO", label: "Efetivo" },
              { value: "CEDIDO", label: "Cedido" },
              { value: "REQUISITADO", label: "Requisitado" },
              { value: "REDISTRIBUIDO", label: "Redistribuído" },
              { value: "REMOVIDO", label: "Removido" },
              { value: "EXERCICIO_PROVISORIO", label: "Exercício provisório" },
            ],
          },
        ]),
  ];
  const quantidadeFiltros = filtros.filter((filtro) =>
    searchParams.get(filtro.nome)?.trim(),
  ).length;

  return (
    <>
      <div className="flex min-h-10 flex-wrap items-center gap-1 border-y border-[var(--border)] px-2 py-1">
        {permitirNovo && (
          <Link
            href={novoHref}
            className="secp-theme-primary-action inline-flex h-8 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium"
          >
            <Plus className="size-4" aria-hidden="true" />
            {novoLabel}
          </Link>
        )}
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)] disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
        {exportCsvHref && exportPdfHref && (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
            <DataTableExportButtons
              csvHref={exportCsvHref}
              pdfHref={exportPdfHref}
              variant="command"
            />
          </>
        )}
        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)]"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtros
          {quantidadeFiltros > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-[var(--primary-foreground)]">
              {quantidadeFiltros}
            </span>
          )}
        </button>
        {acoesComplementares && (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
            <div className="flex items-center">{acoesComplementares}</div>
          </>
        )}
        {acoesDireita && (
          <div className="ml-auto flex items-center justify-end pl-2">{acoesDireita}</div>
        )}
      </div>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Filtros"
        description={`Refine a lista de ${rotuloPessoa.plural.toLowerCase()} pelos critérios desejados.`}
        className="max-h-[88vh] w-[min(94vw,960px)] overflow-y-auto"
      >
        <DataTableToolbar filtros={filtros} />
      </Modal>
    </>
  );
}
