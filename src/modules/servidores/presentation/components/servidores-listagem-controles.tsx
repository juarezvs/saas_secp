"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { Button, Modal } from "@/components/ui";

type Option = { value: string; label: string; searchText?: string };
type Props = {
  orgaos: { id: string; sigla: string }[];
  servidores: Option[];
  lotacoes: Option[];
  categorias?: Option[];
  tipoUsuarioFixo?: string;
  exportCsvHref?: string;
  exportPdfHref?: string;
  permitirNovo?: boolean;
  novoHref?: string;
  novoLabel?: string;
  acoesComplementares?: ReactNode;
  acoesDireita?: ReactNode;
};

const FILTROS = ["busca", "matricula", "cpf", "pis", "nome", "lotacao", "categoriaPessoaId", "tipoUsuario", "orgaoId", "vinculo"] as const;
const ROTULOS: Record<(typeof FILTROS)[number], string> = {
  busca: "Pesquisa", matricula: "Matrícula", cpf: "CPF", pis: "PIS/PASEP",
  nome: "Pessoa", lotacao: "Lotação", categoriaPessoaId: "Categoria",
  tipoUsuario: "Tipo", orgaoId: "Órgão", vinculo: "Vínculo",
};
const TIPOS = [{ value: "SERVIDOR", label: "Servidores" }, { value: "ESTAGIARIO", label: "Estagiários" }, { value: "PRESTADOR", label: "Prestadores" }, { value: "VOLUNTARIO", label: "Voluntários" }];
const VINCULOS = ["EFETIVO", "CEDIDO", "REQUISITADO", "REDISTRIBUIDO", "REMOVIDO", "EXERCICIO_PROVISORIO"].map((value) => ({ value, label: value.replaceAll("_", " ") }));
const commandClassName = "inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition hover:bg-[var(--muted)] disabled:opacity-60";
const inputClassName = "mt-2 h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--secp-theme-accent)]";

export function ServidoresListagemControles({ orgaos, servidores, lotacoes, categorias = [], tipoUsuarioFixo, exportCsvHref, exportPdfHref, permitirNovo = false, novoHref = "/servidores/novo", novoLabel = "Novo servidor", acoesComplementares, acoesDireita }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtrosDisponiveis = useMemo(() => tipoUsuarioFixo ? FILTROS.filter((item) => item !== "tipoUsuario") : [...FILTROS], [tipoUsuarioFixo]);
  const filtrosAtivos = useMemo(() => filtrosDisponiveis.flatMap((nome) => {
    const valor = searchParams.get(nome)?.trim();
    return valor ? [{ nome, valor }] : [];
  }), [filtrosDisponiveis, searchParams]);

  function navegar(params: URLSearchParams, fechar = true) {
    params.set("pagina", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      if (fechar) setAberto(false);
    });
  }
  function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    for (const nome of filtrosDisponiveis) {
      const valor = String(dados.get(nome) ?? "").trim();
      if (valor) params.set(nome, valor); else params.delete(nome);
    }
    navegar(params);
  }
  function remover(nome: (typeof FILTROS)[number]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(nome);
    navegar(params, false);
  }
  function limpar() {
    const params = new URLSearchParams(searchParams.toString());
    for (const nome of filtrosDisponiveis) params.delete(nome);
    navegar(params);
  }

  return <>
    <div className="flex min-h-10 flex-wrap items-center gap-1 border-y border-[var(--border)] px-2 py-1">
      {permitirNovo && <Link href={novoHref} className="secp-theme-primary-action inline-flex h-8 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium"><Plus className="size-4" />{novoLabel}</Link>}
      <button type="button" onClick={() => startTransition(() => router.refresh())} disabled={pending} className={commandClassName}><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />Atualizar</button>
      {exportCsvHref && exportPdfHref && <><Separador /><DataTableExportButtons csvHref={exportCsvHref} pdfHref={exportPdfHref} variant="command" /></>}
      <Separador />
      <button type="button" onClick={() => setAberto(true)} className={commandClassName}><SlidersHorizontal className="size-4" />Filtros{filtrosAtivos.length > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-[var(--primary-foreground)]">{filtrosAtivos.length}</span>}</button>
      {acoesComplementares && <><Separador /><div className="flex items-center">{acoesComplementares}</div></>}
      {acoesDireita && <div className="ml-auto flex items-center justify-end pl-2">{acoesDireita}</div>}
    </div>
    {filtrosAtivos.length > 0 && <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
      <SlidersHorizontal className="size-3.5 text-[var(--muted-foreground)]" />
      {filtrosAtivos.map((filtro) => <button key={filtro.nome} type="button" onClick={() => remover(filtro.nome)} className="inline-flex h-7 items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--muted)]/50 px-2 text-xs hover:bg-[var(--muted)]"><span className="font-medium">{ROTULOS[filtro.nome]}:</span><span className="max-w-48 truncate">{rotuloValor(filtro.nome, filtro.valor, { orgaos, servidores, lotacoes, categorias })}</span><X className="size-3" /></button>)}
      <button type="button" onClick={limpar} className="h-7 px-2 text-xs font-medium text-[var(--secp-theme-accent)] hover:underline">Limpar todos</button>
    </div>}
    <Modal open={aberto} onOpenChange={setAberto} title="Filtros" description="Refine a lista de servidores pelos critérios desejados." className="max-h-[88vh] w-[min(94vw,900px)] overflow-y-auto">
      <form onSubmit={aplicar}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo nome="busca" label="Consulta geral" valor={searchParams.get("busca")} /><Campo nome="matricula" label="Matrícula" valor={searchParams.get("matricula")} /><Campo nome="cpf" label="CPF" valor={searchParams.get("cpf")} /><Campo nome="pis" label="PIS/PASEP" valor={searchParams.get("pis")} />
          <Selecao nome="nome" label="Pessoa" valor={searchParams.get("nome")} opcoes={servidores} /><Selecao nome="lotacao" label="Lotação" valor={searchParams.get("lotacao")} opcoes={lotacoes} /><Selecao nome="categoriaPessoaId" label="Categoria" valor={searchParams.get("categoriaPessoaId")} opcoes={categorias} />
          {!tipoUsuarioFixo && <Selecao nome="tipoUsuario" label="Tipo" valor={searchParams.get("tipoUsuario")} opcoes={TIPOS} />}
          <Selecao nome="orgaoId" label="Órgão" valor={searchParams.get("orgaoId")} opcoes={orgaos.map((item) => ({ value: item.id, label: item.sigla }))} /><Selecao nome="vinculo" label="Vínculo" valor={searchParams.get("vinculo")} opcoes={VINCULOS} />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4"><Button type="button" variant="ghost" onClick={limpar} disabled={pending || filtrosAtivos.length === 0}>Limpar filtros</Button><Button type="submit" loading={pending}>Aplicar filtros</Button></div>
      </form>
    </Modal>
  </>;
}

function Separador() { return <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />; }
function Campo({ nome, label, valor }: { nome: string; label: string; valor: string | null }) { return <label><span className="text-sm font-medium">{label}</span><input name={nome} defaultValue={valor ?? ""} className={inputClassName} /></label>; }
function Selecao({ nome, label, valor, opcoes }: { nome: string; label: string; valor: string | null; opcoes: Option[] }) { return <label><span className="text-sm font-medium">{label}</span><select name={nome} defaultValue={valor ?? ""} className={inputClassName}><option value="">Todos</option>{opcoes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>; }
function rotuloValor(nome: string, valor: string, dados: { orgaos: Props["orgaos"]; servidores: Option[]; lotacoes: Option[]; categorias: Option[] }) {
  if (nome === "orgaoId") return dados.orgaos.find((item) => item.id === valor)?.sigla ?? valor;
  const opcoes = nome === "nome" ? dados.servidores : nome === "lotacao" ? dados.lotacoes : nome === "categoriaPessoaId" ? dados.categorias : nome === "tipoUsuario" ? TIPOS : nome === "vinculo" ? VINCULOS : [];
  return opcoes.find((item) => item.value === valor)?.label ?? valor;
}
