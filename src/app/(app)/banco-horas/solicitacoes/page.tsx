import { CalendarClock, Send } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarSolicitacaoBancoHorasAction } from "@/modules/banco-horas/application/actions/criar-solicitacao-banco-horas.action";
import { minutosParaHoraBanco } from "@/modules/banco-horas/application/services/formatar-banco-horas.service";
import { ModalidadeBancoHorasField } from "@/modules/banco-horas/presentation/components/modalidade-banco-horas-field";
import { buscarServidorBancoHorasPorUsuarioId, listarSolicitacoesBancoHorasServidor } from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";

type Props = { searchParams: Promise<{ erro?: string; pagina?: string; itensPorPagina?: string }> };
const rotuloTipo = (tipo: string) => ({ HORA_CREDITO_PREVIA: "Gerar credito", FOLGA_BANCO_HORAS: "Utilizar saldo", COMPENSACAO: "Compensar debito", CONVERSAO_DIA_ESPECIAL_BANCO_HORAS: "Converter trabalho em dia especial" })[tipo] ?? tipo;
const rotuloStatus = (status: string) => ({ RASCUNHO: "Rascunho", ENVIADA: "Enviada", EM_ANALISE: "Em analise", DEFERIDA: "Deferida", INDEFERIDA: "Indeferida", CANCELADA: "Cancelada" })[status] ?? status;
function extrairMinutos(dados: unknown) { if (!dados || typeof dados !== "object") return null; const valor = (dados as { minutosSolicitados?: unknown }).minutosSolicitados; return typeof valor === "number" ? valor : null; }
const formatarData = (data: Date | null) => data ? new Intl.DateTimeFormat("pt-BR").format(data) : "-";

export default async function BancoHorasSolicitacoesPage({ searchParams }: Props) {
  const [permissao, params] = await Promise.all([exigirPermissaoOuRedirecionar("solicitacoes:criar:proprio"), searchParams]);
  const hoje = new Date();
  const servidor = permissao.usuarioId ? await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId, { anoReferencia: hoje.getFullYear(), mesReferencia: hoje.getMonth() + 1 }) : null;
  const solicitacoes = servidor ? await listarSolicitacoesBancoHorasServidor({ servidorId: servidor.id }) : [];
  const itensPorPagina = Math.max(1, Number(params.itensPorPagina ?? 10));
  const totalPaginas = Math.max(1, Math.ceil(solicitacoes.length / itensPorPagina));
  const pagina = Math.min(Math.max(1, Number(params.pagina ?? 1)), totalPaginas);
  const itens = solicitacoes.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const montarHrefPagina = (novaPagina: number) => `/banco-horas/solicitacoes?${new URLSearchParams({ pagina: String(novaPagina), itensPorPagina: String(itensPorPagina) })}`;
  const hojeIso = hoje.toISOString().slice(0, 10);

  return <div className="space-y-3">
    <PageHeader icon={CalendarClock} titulo="Solicitações de banco de horas" contexto={<Breadcrumb embedded items={[{ label: "Banco de horas", href: "/banco-horas" }, { label: "Solicitações" }]} />} variant="blade" />
    {params.erro ? <section className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{params.erro}</section> : null}
    <details className="border border-[var(--border)] bg-[var(--card)]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Nova solicitação</summary>
      <form action={criarSolicitacaoBancoHorasAction} className="grid gap-4 border-t p-4 md:grid-cols-2">
        <ModalidadeBancoHorasField />
        <label className="text-sm font-semibold">Data inicial<input type="date" name="dataInicio" required defaultValue={hojeIso} className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm" /></label>
        <label className="text-sm font-semibold">Data final<input type="date" name="dataFim" required defaultValue={hojeIso} className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm" /></label>
        <label className="text-sm font-semibold">Quantidade de horas<input type="number" name="horasSolicitadas" min="0.25" max="16" step="0.25" required className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm" /></label>
        <label className="text-sm font-semibold">Titulo<input name="titulo" required minLength={5} maxLength={180} className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm" /></label>
        <label className="text-sm font-semibold md:col-span-2">Justificativa<textarea name="justificativa" required minLength={10} maxLength={3000} rows={4} className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm" /></label>
        <div className="md:col-span-2"><button type="submit" className="secp-theme-primary-action inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-sm font-semibold"><Send className="size-4" />Enviar para chefia</button></div>
      </form>
    </details>
    <DataTableShell title="Minhas solicitações" total={solicitacoes.length} pagina={pagina} totalPaginas={totalPaginas} itensPorPagina={itensPorPagina} montarHrefPagina={montarHrefPagina} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} visualizarHrefBase="/solicitacoes" />}>
      <StandardDataTable columns={[{ key: "pedido", label: "Pedido" }, { key: "tipo", label: "Tipo" }, { key: "periodo", label: "Período" }, { key: "horas", label: "Horas" }, { key: "status", label: "Status" }]} rows={itens.map((item) => { const minutos = extrairMinutos(item.dadosSolicitados); return { id: item.id, label: item.titulo, visualizarHref: `/solicitacoes/${item.id}`, cells: { pedido: { value: item.titulo }, tipo: { value: rotuloTipo(item.tipo) }, periodo: { value: `${formatarData(item.dataInicio)} a ${formatarData(item.dataFim)}` }, horas: { value: minutos === null ? "-" : minutosParaHoraBanco(minutos) }, status: { value: rotuloStatus(item.status), tone: item.status === "DEFERIDA" ? "success" : item.status === "INDEFERIDA" || item.status === "CANCELADA" ? "danger" : "muted" } } }; })} emptyMessage="Nenhuma solicitação de banco de horas foi registrada." minWidth={800} />
    </DataTableShell>
  </div>;
}
