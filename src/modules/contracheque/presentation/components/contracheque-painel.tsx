"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Building2, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, FileText, Filter, Fingerprint, Info, Loader2, Printer, ReceiptText, Search, Share2, ShieldCheck, TrendingDown, UserRound, Wallet, Zap, ChartNoAxesColumnIncreasing } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";
import { formatarMoedaContracheque, rotuloCompetenciaContracheque } from "../../application/services/formatar-contracheque.service";
import type { ContrachequeDados } from "../../domain/contracheque.types";
import styles from "./contracheque-painel.module.css";

type Documento = { id: string; competencia: string; descricao: string; data: string; totais: ContrachequeDados["totais"] | null };
type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
export type ContrachequePainelProps = {
  competencia: string; competencias: string[]; documentos: Documento[];
  selecionadoId: string | null; identidade: { nome: string; matricula: string; lotacao: string };
  totais: ContrachequeDados["totais"] | null; margem: number | null; children: ReactNode;
  erro?: string | null; historicoDisponivel: boolean;
};
function hrefDocumento(d: Pick<Documento, "competencia" | "id">, pdf = false) {
  return `${pdf ? "/api/contracheque/pdf" : "/meu-contracheque"}?${new URLSearchParams({ competencia: d.competencia, documento: d.id })}`;
}
const normalizar = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const mes = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`)).replace(". de ", "/").replace(" de ", "/");
function Icone({ icon: IconComponent, green = false }: { icon: Icon; green?: boolean }) {
  return <span className={`${styles.icon} ${green ? styles.greenIcon : ""}`}><IconComponent className="size-5" aria-hidden /></span>;
}
function Titulo({ icon, titulo, texto }: { icon: Icon; titulo: string; texto: string }) {
  return <div className="mb-3 flex items-center gap-2.5"><Icone icon={icon} /><div><h2 className={styles.panelTitle}>{titulo}</h2><p className="text-xs text-muted-foreground">{texto}</p></div></div>;
}
function MiniSerie({ valores, color }: { valores: number[]; color: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores), range = Math.max(...valores) - min || 1;
  const points = valores.map((v, i) => `${i * 72 / (valores.length - 1)},${28 - (v - min) / range * 22}`).join(" ");
  return <svg className="h-8 w-8 shrink-0" viewBox="0 0 72 32" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ContrachequePainel(props: ContrachequePainelProps) {
  const { competencia, competencias, documentos, selecionadoId, identidade, totais, margem, children, erro, historicoDisponivel } = props;
  const router = useRouter();
  const [pendente, transicao] = useTransition();
  const [filtros, setFiltros] = useState(false), [busca, setBusca] = useState(""), [tipo, setTipo] = useState("todos"), [pagina, setPagina] = useState(1);
  const [arquivo, setArquivo] = useState<File | null>(null), [preparando, setPreparando] = useState(false), [mensagem, setMensagem] = useState("");
  const [documentoPreparado, setDocumentoPreparado] = useState<string | null>(null);
  const tipos = Array.from(new Set(documentos.map(d => d.descricao))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtrados = documentos.filter(d => (tipo === "todos" || d.descricao === tipo) && normalizar(`${d.descricao} ${d.competencia} ${mes(d.competencia)} ${rotuloCompetenciaContracheque(d.competencia)}`).includes(normalizar(busca.trim())));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 6));
  const paginaAtual = Math.min(pagina, paginas), exibidos = filtrados.slice((paginaAtual - 1) * 6, paginaAtual * 6);
  const series = documentos.filter(d => d.totais).slice(0, 12).toReversed();
  const hrefPdf = selecionadoId ? hrefDocumento({ id: selecionadoId, competencia }, true) : null;
  const numeroCompetencias = new Set(documentos.map(d => d.competencia)).size;
  async function compartilhar() {
    if (!hrefPdf) return;
    if (!navigator.share || !navigator.canShare?.({ files: [new File([""], "contracheque.pdf", { type: "application/pdf" })] })) {
      setMensagem("Este navegador não compartilha arquivos. Baixe o PDF e envie pelo aplicativo de sua preferência."); return;
    }
    if (arquivo && documentoPreparado === selecionadoId) {
      try { await navigator.share({ files: [arquivo], title: "Meu contracheque" }); setMensagem("Arquivo entregue ao compartilhamento do dispositivo."); }
      catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setMensagem("Não foi possível compartilhar. Baixe o PDF para enviá-lo."); }
      return;
    }
    setPreparando(true); setMensagem("");
    try {
      const r = await fetch(hrefPdf, { cache: "no-store" });
      if (!r.ok || !r.headers.get("content-type")?.includes("application/pdf")) throw new Error();
      setArquivo(new File([await r.blob()], `contracheque-${competencia}.pdf`, { type: "application/pdf" }));
      setDocumentoPreparado(selecionadoId);
      setMensagem("PDF pronto. Toque novamente em Compartilhar para escolher o destinatário.");
    } catch { setMensagem("Não foi possível preparar o PDF. Tente novamente."); }
    finally { setPreparando(false); }
  }
  function selecionarCompetencia(value: string) {
    setArquivo(null); setDocumentoPreparado(null); setMensagem("");
    transicao(() => router.push(`/meu-contracheque?${new URLSearchParams({ competencia: value })}`));
  }
  const cards: { title: string; value: string; help: string; icon: Icon; green?: boolean }[] = [
    { title: "Contracheques no período", value: historicoDisponivel ? String(documentos.length) : "—", help: "Últimos 12 meses até a competência", icon: FileText },
    { title: "Líquido selecionado", value: totais ? formatarMoedaContracheque(totais.liquido) : "—", help: "Valor do documento em visualização", icon: Banknote, green: true },
    { title: "Descontos", value: totais ? formatarMoedaContracheque(totais.descontos) : "—", help: totais && totais.bruto > 0 ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(totais.descontos / totais.bruto * 100)}% dos vencimentos selecionados` : "Valor informado na folha", icon: TrendingDown },
    { title: "Competências no período", value: historicoDisponivel ? String(numeroCompetencias) : "—", help: "Meses com documentos na consulta", icon: CalendarDays },
    { title: "Margem consignável", value: margem === null ? "Não informada" : formatarMoedaContracheque(margem), help: "Valor informado pelo SARH", icon: Wallet, green: margem !== null },
  ];
  return <div className={styles.dashboard} aria-busy={pendente}>
    <style>{`@media print { body { background: white !important; } body * { visibility: hidden !important; } [data-contracheque-impressao], [data-contracheque-impressao] * { visibility: visible !important; color: #0f172a !important; background: transparent !important; } [data-contracheque-impressao] { position: absolute !important; left: 0; top: 0; width: 100%; border: 0; box-shadow: none; background: white !important; color: black !important; } [data-contracheque-impressao] details { display:none; } [data-contracheque-rubricas] { max-height: none !important; overflow: visible !important; } @page { margin: 14mm; } }`}</style>
    <header className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-start"><div><h1 className={styles.title}>Meu Contracheque</h1><p className="mt-1 text-sm text-indigo-800/80 dark:text-indigo-200">Consulte, visualize e baixe seus demonstrativos de pagamento.</p></div>
      <div className="flex flex-wrap items-end gap-2"><div className={styles.filterBox}><CalendarDays className="size-5 shrink-0 text-violet-600" aria-hidden /><div className="min-w-0 flex-1"><label htmlFor="contracheque-competencia" className="text-[10px] text-muted-foreground">Competência</label><SearchableSelect id="contracheque-competencia" name="competencia" value={competencia} disabled={pendente} options={Array.from(new Set([competencia, ...competencias])).sort().reverse().map(value => ({ value, label: rotuloCompetenciaContracheque(value) }))} onValueChange={selecionarCompetencia} triggerClassName="!h-7 !border-0 !bg-transparent !px-0 !shadow-none !text-xs capitalize" /></div></div>
        <div className={styles.filterBox}><ReceiptText className="size-5 shrink-0 text-violet-600" aria-hidden /><div className="min-w-0 flex-1"><label htmlFor="contracheque-tipo" className="text-[10px] text-muted-foreground">Tipo de documento</label><SearchableSelect id="contracheque-tipo" name="tipo" options={[{ value: "todos", label: "Todos os contracheques" }, ...tipos.map(value => ({ value, label: value }))]} value={tipo} onValueChange={v => { setTipo(v); setPagina(1); }} triggerClassName="!h-7 !border-0 !bg-transparent !px-0 !shadow-none !text-xs" /></div></div>
        <button className={styles.filterButton} onClick={() => setFiltros(!filtros)} aria-expanded={filtros} aria-controls="contracheque-filtros"><Filter className="size-4" aria-hidden />Filtros</button>
      </div></header>
    <dl className={styles.identity}>{([[UserRound, "Servidor", identidade.nome], [Fingerprint, "Matrícula", identidade.matricula], [Building2, "Lotação", identidade.lotacao]] as const).map(([I, label, value]) => <div key={label} className="flex min-w-0 items-center gap-2"><Icone icon={I} /><div className="min-w-0"><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="truncate text-xs font-bold" title={value}>{value}</dd></div></div>)}</dl>
    {filtros && <div id="contracheque-filtros" className={`${styles.panel} flex flex-wrap items-center gap-3`}><label className="relative min-w-60 flex-1"><span className="sr-only">Pesquisar documentos</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden /><input className="h-10 w-full rounded-lg border border-indigo-100 bg-transparent pl-9 pr-3 text-sm dark:border-indigo-800" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar competência ou descrição…" /></label><button className="text-xs font-semibold text-violet-700 dark:text-violet-300" onClick={() => { setBusca(""); setTipo("todos"); setPagina(1); }}>Limpar filtros</button><p className="text-xs text-muted-foreground">Período: 12 meses encerrados em <span className="capitalize">{rotuloCompetenciaContracheque(competencia)}</span>.</p></div>}
    {erro && <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><Info className="mt-0.5 size-4 shrink-0" />{erro}</div>}
    <section aria-label="Indicadores do contracheque" className={styles.cards}>{cards.map(c => <div key={c.title} className={styles.stat}><Icone icon={c.icon} green={c.green} /><div className="min-w-0"><h2 className="text-[11px] font-semibold">{c.title}</h2><p className={`mt-1 truncate text-lg font-extrabold tracking-tight tabular-nums ${c.green ? "text-emerald-700 dark:text-emerald-300" : ""}`} title={c.value}>{c.value}</p><p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{c.help}</p></div></div>)}</section>
    <div className={styles.columns}><div className="min-w-0 space-y-3"><section className={styles.panel}><Titulo icon={FileText} titulo="Histórico de contracheques" texto="Acompanhe suas competências e consulte os documentos disponíveis." />
      <div className="overflow-x-auto"><table className={styles.history}><caption className="sr-only">Contracheques do próprio servidor nos 12 meses até a competência selecionada</caption><thead><tr><th>Competência</th><th>Tipo</th><th>Líquido</th><th>Situação</th><th>Data da folha</th><th>Ações</th></tr></thead><tbody>{exibidos.map(d => <tr key={d.id} className={d.id === selecionadoId ? styles.selectedRow : ""} aria-current={d.id === selecionadoId ? "true" : undefined}><td className="whitespace-nowrap font-semibold capitalize">{mes(d.competencia)}</td><td className="max-w-44"><Link prefetch={false} href={hrefDocumento(d)} className="line-clamp-2 hover:underline" title={d.descricao}>{d.descricao}</Link></td><td className="whitespace-nowrap font-semibold tabular-nums">{d.totais ? formatarMoedaContracheque(d.totais.liquido) : "Não informado"}</td><td><span className={styles.available}>Disponível</span></td><td className="whitespace-nowrap">{d.data.slice(0, 10).split("-").reverse().join("/")}</td><td><div className="flex gap-1"><Link prefetch={false} href={hrefDocumento(d)} className={styles.iconButton} title={`Visualizar ${d.descricao} de ${mes(d.competencia)}`}><Eye className="size-4" /><span className="sr-only">Visualizar {d.descricao} de {mes(d.competencia)}</span></Link><a href={hrefDocumento(d, true)} className={styles.iconButton} title={`Baixar PDF de ${mes(d.competencia)}`}><Download className="size-4" /><span className="sr-only">Baixar PDF de {mes(d.competencia)}</span></a></div></td></tr>)}</tbody></table></div>
      {!exibidos.length && <p className="p-8 text-center text-sm text-muted-foreground">{!historicoDisponivel ? "Histórico temporariamente indisponível." : documentos.length ? "Nenhum documento corresponde aos filtros." : "Nenhum contracheque encontrado no período."}</p>}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-50 pt-3 text-[11px] text-muted-foreground dark:border-indigo-900"><span className="flex items-center gap-2"><Info className="size-3.5 text-violet-600" />{filtrados.length ? `Mostrando ${(paginaAtual - 1) * 6 + 1}–${Math.min(paginaAtual * 6, filtrados.length)} de ${filtrados.length} documentos` : "Nenhum documento na listagem"}</span><div className="flex items-center gap-1"><button className={styles.iconButton} disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></button><span className="px-2 font-semibold text-violet-700 dark:text-violet-300">{paginaAtual} / {paginas}</span><button className={styles.iconButton} disabled={paginaAtual >= paginas} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próxima página"><ChevronRight className="size-4" /></button></div></footer>
    </section><section className={styles.panel}><Titulo icon={ReceiptText} titulo="Documentos relacionados" texto="Demonstrativos disponíveis na competência selecionada." />
      <div className="divide-y divide-indigo-50 dark:divide-indigo-950">{documentos.filter(d => d.competencia === competencia).map(d => <div key={d.id} className="flex items-center gap-3 py-3"><FileText className="size-5 shrink-0 text-violet-600" /><div className="min-w-0 flex-1"><Link prefetch={false} href={hrefDocumento(d)} className="block truncate text-xs font-semibold hover:underline">{d.descricao}</Link><p className="mt-0.5 text-[10px] text-muted-foreground">Demonstrativo de {mes(d.competencia)}</p></div><a className={styles.iconButton} href={hrefDocumento(d, true)} aria-label={`Baixar ${d.descricao}`}><Download className="size-4" /></a></div>)}</div>
      {!documentos.some(d => d.competencia === competencia) && <p className="py-3 text-xs text-muted-foreground">Nenhum documento relacionado nesta competência.</p>}
      <p className="mt-2 rounded-lg bg-indigo-50/60 p-3 text-[11px] leading-5 text-muted-foreground dark:bg-indigo-950/40">Informe anual de rendimentos e comprovante bancário não estão disponíveis nesta consulta.</p>
    </section></div>
    <div className="min-w-0 space-y-3"><section className={styles.panel}><Titulo icon={Eye} titulo="Visualização do contracheque" texto="Pré-visualização do documento selecionado." />{pendente && <p role="status" className="mb-2 flex items-center gap-2 text-xs text-violet-700"><Loader2 className="size-3 animate-spin" />Atualizando documento…</p>}{children}</section>
      <section className={styles.panel}><div className="flex items-center justify-between gap-2"><Titulo icon={ChartNoAxesColumnIncreasing} titulo="Resumo financeiro" texto="Valores do documento selecionado." /><span className="text-[10px] font-semibold capitalize text-violet-700 dark:text-violet-300">{mes(competencia)}</span></div><div className="grid gap-2 sm:grid-cols-3">{([{ key: "bruto", label: "Vencimentos", icon: Banknote, color: "#10b981" }, { key: "descontos", label: "Descontos", icon: TrendingDown, color: "#f43f5e" }, { key: "liquido", label: "Líquido", icon: ChartNoAxesColumnIncreasing, color: "#7c3aed" }] as const).map(item => <div key={item.key} className="flex min-w-0 items-center justify-between gap-1 rounded-lg border border-indigo-100 p-2 dark:border-indigo-900"><div className="min-w-0"><p className="flex items-center gap-1 text-[10px] text-muted-foreground"><item.icon className="size-3" style={{ color: item.color }} />{item.label}</p><p className="mt-1 whitespace-nowrap text-xs font-bold tabular-nums">{totais ? formatarMoedaContracheque(totais[item.key]) : "—"}</p></div><MiniSerie valores={series.map(d => d.totais![item.key])} color={item.color} /></div>)}</div>{series.length > 1 && <p className="mt-2 text-[9px] text-muted-foreground">Minigráficos: últimos {series.length} documentos consultados, do mais antigo ao mais recente.</p>}</section>
      <section className={styles.panel}><Titulo icon={Zap} titulo="Ações rápidas" texto="Baixe, imprima ou compartilhe o documento selecionado." /><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{hrefPdf && totais ? <RelatorioExportacaoButton href={hrefPdf} modo="auto" className={styles.action}>Baixar PDF</RelatorioExportacaoButton> : <button disabled className={styles.action}><Download className="size-4" />Baixar PDF</button>}<button disabled={!totais} className={styles.action} onClick={() => window.print()}><Printer className="size-4" />Imprimir</button><button disabled={!totais || preparando} className={styles.action} onClick={() => void compartilhar()}>{preparando ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}{preparando ? "Preparando…" : arquivo && documentoPreparado === selecionadoId ? "Compartilhar PDF pronto" : "Compartilhar"}</button></div>{mensagem && <p role="status" className="mt-3 text-xs text-muted-foreground">{mensagem}</p>}</section>
    </div></div>
    <footer className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground"><ShieldCheck className="size-4 text-violet-600" />Dados do próprio servidor consultados no SARH. Valores financeiros não são armazenados no SECP.</footer>
  </div>;
}
