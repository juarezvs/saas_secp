"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit, Eye, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { DataTableExportButtons } from "./data-table-export-buttons";
import { useDataTableSelection } from "./data-table-selection";
import { Button, Modal } from "@/components/ui";

type Option = { value: string; label: string; searchText?: string };
type BaseFiltro = { nome: string; label: string; className?: string; defaultValue?: string };
export type DataTableFiltroTexto = BaseFiltro & { tipo: "texto"; placeholder?: string; comIconeBusca?: boolean };
export type DataTableFiltroSelect = BaseFiltro & { tipo: "select"; options: Option[]; limparAoAlterar?: string[] };
export type DataTableFiltroSearchableSelect = BaseFiltro & { tipo: "searchable-select"; options: Option[]; placeholder?: string; searchPlaceholder?: string; limparAoAlterar?: string[] };
export type DataTableFiltroCompetencia = BaseFiltro & { tipo: "competencia" };
export type DataTableFiltroData = BaseFiltro & { tipo: "data" };
export type DataTableFiltro = DataTableFiltroTexto | DataTableFiltroSelect | DataTableFiltroSearchableSelect | DataTableFiltroCompetencia | DataTableFiltroData;

type Props = { filtros: DataTableFiltro[]; csvHref?: string; pdfHref?: string; csvAssincrono?: boolean; pdfAssincrono?: boolean; novoHref?: string; novoLabel?: string; visualizarHrefBase?: string; visualizarHrefSufixo?: string; editarHrefBase?: string; editarHrefSufixo?: string; podeEditar?: boolean; acoes?: Array<{ href: string; label: string }>; acoesInicio?: ReactNode; mostrarFiltros?: boolean };
const commandClass = "inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)] disabled:opacity-50";
const inputClass = "mt-2 h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--secp-theme-accent)]";

export function DataTableToolbar({ filtros, csvHref, pdfHref, csvAssincrono = false, pdfAssincrono = false, novoHref, novoLabel = "Novo", visualizarHrefBase, visualizarHrefSufixo = "", editarHrefBase, editarHrefSufixo = "/editar", podeEditar = false, acoes = [], acoesInicio, mostrarFiltros = true }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname(); const router = useRouter(); const searchParams = useSearchParams();
  const { selecionados } = useDataTableSelection();
  const unico = selecionados.size === 1 ? [...selecionados][0] : null;
  const ativos = useMemo(() => filtros.flatMap((f) => { const valor = searchParams.get(f.nome)?.trim(); return valor ? [{ filtro: f, valor }] : []; }), [filtros, searchParams]);
  function navegar(params: URLSearchParams, fechar = true) { params.set("pagina", "1"); startTransition(() => { router.push(`${pathname}?${params}`); if (fechar) setAberto(false); }); }
  function aplicar(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const params = new URLSearchParams(searchParams.toString()); for (const filtro of filtros) { const valor = String(data.get(filtro.nome) ?? "").trim(); if (valor) params.set(filtro.nome, valor); else params.delete(filtro.nome); } navegar(params); }
  function remover(nome: string) { const params = new URLSearchParams(searchParams.toString()); params.delete(nome); navegar(params, false); }
  function limpar() { const params = new URLSearchParams(searchParams.toString()); for (const filtro of filtros) params.delete(filtro.nome); navegar(params); }
  return <>
    <div className="flex min-h-10 flex-wrap items-center gap-1 px-2 py-1">
      {novoHref ? <Link href={novoHref} className="secp-theme-primary-action inline-flex h-8 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium"><Plus className="size-4" />{novoLabel}</Link> : null}
      {acoesInicio}
      <button type="button" onClick={() => startTransition(() => router.refresh())} disabled={pending} className={commandClass}><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />Atualizar</button>
      {visualizarHrefBase ? unico ? <Link href={`${visualizarHrefBase}/${unico}${visualizarHrefSufixo}`} className={commandClass}><Eye className="size-4" />Visualizar</Link> : <button disabled className={commandClass}><Eye className="size-4" />Visualizar</button> : null}
      {editarHrefBase ? unico && podeEditar ? <Link href={`${editarHrefBase}/${unico}${editarHrefSufixo}`} className={commandClass}><Edit className="size-4" />Editar</Link> : <button disabled className={commandClass}><Edit className="size-4" />Editar</button> : null}
      {acoes.map((acao) => <Link key={`${acao.href}-${acao.label}`} href={acao.href} className={commandClass}>{acao.label}</Link>)}
      {(novoHref || visualizarHrefBase || editarHrefBase) ? <Separador /> : null}
      {mostrarFiltros ? <button type="button" onClick={() => setAberto(true)} className={commandClass}><SlidersHorizontal className="size-4" />Filtros{ativos.length ? <span className="grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">{ativos.length}</span> : null}</button> : null}
      {csvHref && pdfHref ? <><Separador /><DataTableExportButtons csvHref={csvHref} pdfHref={pdfHref} csvAssincrono={csvAssincrono} pdfAssincrono={pdfAssincrono} variant="command" /></> : null}
    </div>
    {ativos.length ? <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] px-3 py-2"><SlidersHorizontal className="size-3.5 text-[var(--muted-foreground)]" />{ativos.map(({ filtro, valor }) => <button key={filtro.nome} type="button" onClick={() => remover(filtro.nome)} className="inline-flex h-7 items-center gap-1 rounded-sm border bg-[var(--muted)]/50 px-2 text-xs"><b>{filtro.label}:</b><span className="max-w-48 truncate">{rotulo(filtro, valor)}</span><X className="size-3" /></button>)}<button type="button" onClick={limpar} className="h-7 px-2 text-xs font-medium text-[var(--secp-theme-accent)] hover:underline">Limpar todos</button></div> : null}
    {mostrarFiltros ? <Modal open={aberto} onOpenChange={setAberto} title="Filtros" description="Refine a listagem pelos criterios desejados." className="max-h-[88vh] w-[min(94vw,900px)] overflow-y-auto">
      <form onSubmit={aplicar}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtros.map((filtro) => <CampoFiltro key={filtro.nome} filtro={filtro} valor={searchParams.get(filtro.nome) ?? filtro.defaultValue ?? ""} />)}</div><div className="mt-6 flex justify-between border-t pt-4"><Button type="button" variant="ghost" onClick={limpar} disabled={!ativos.length}>Limpar filtros</Button><Button type="submit" loading={pending}>Aplicar filtros</Button></div></form>
    </Modal> : null}
  </>;
}

function CampoFiltro({ filtro, valor }: { filtro: DataTableFiltro; valor: string }) { const tipo = filtro.tipo === "data" ? "date" : filtro.tipo === "competencia" ? "month" : "text"; return <label className={filtro.className}><span className="text-sm font-medium">{filtro.label}</span>{filtro.tipo === "select" || filtro.tipo === "searchable-select" ? <select name={filtro.nome} defaultValue={valor} className={inputClass}>{filtro.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input name={filtro.nome} type={tipo} defaultValue={valor} placeholder={filtro.tipo === "texto" ? filtro.placeholder : undefined} className={inputClass} />}</label>; }
function rotulo(filtro: DataTableFiltro, valor: string) { return filtro.tipo === "select" || filtro.tipo === "searchable-select" ? filtro.options.find((o) => o.value === valor)?.label ?? valor : valor; }
function Separador() { return <span className="mx-1 h-5 w-px bg-[var(--border)]" />; }
