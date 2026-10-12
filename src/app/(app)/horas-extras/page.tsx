import { CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
import { Card, CardContent } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { excluirRascunhoHorasExtrasAction } from "@/modules/horas-extras/application/actions/excluir-rascunho-horas-extras.action";
import { listarConfiguracaoHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-config.repository";
import { listarSolicitacoesHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { ExcluirRascunhoHorasExtrasButton } from "@/modules/horas-extras/presentation/components/excluir-rascunho-horas-extras-button";

const rotulosStatus: Record<string, string> = { DRAFT: "Rascunho", SUBMITTED: "Enviada", IN_WORKFLOW: "Em tramitação", RETURNED: "Devolvida", APPROVED: "Aprovada", REJECTED: "Rejeitada", CANCELLED: "Cancelada" };
const formatarData = (data: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
const formatarMinutos = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

export default async function HorasExtrasPage({ searchParams }: { searchParams?: Promise<{ pagina?: string; itensPorPagina?: string }> }) {
  const [permissao, params = {}] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(["horas-extras:visualizar:proprio", "horas-extras:solicitar:proprio", "horas-extras:analisar:chefia", "horas-extras:visualizar-execucao:global", "horas-extras:visualizar-folha:global"]),
    searchParams,
  ]);
  let configuracao: Awaited<ReturnType<typeof listarConfiguracaoHorasExtras>> | null = null;
  let solicitacoes: Awaited<ReturnType<typeof listarSolicitacoesHorasExtras>> = [];
  let erroConfiguracao: string | null = null;
  try {
    [configuracao, solicitacoes] = await Promise.all([
      listarConfiguracaoHorasExtras({ orgaoIds: permissao.orgaoIds, escopoGlobal: permissao.perfilAtivoEscopoGlobal }),
      listarSolicitacoesHorasExtras({ orgaoIds: permissao.orgaoIds, escopoGlobal: permissao.perfilAtivoEscopoGlobal, usuarioId: permissao.usuarioId, limite: 100 }),
    ]);
  } catch (error) {
    erroConfiguracao = error instanceof Error ? error.message : "Não foi possível consultar a configuração de horas extras.";
  }
  const itensPorPagina = Math.max(1, Number(params.itensPorPagina ?? 10));
  const totalPaginas = Math.max(1, Math.ceil(solicitacoes.length / itensPorPagina));
  const pagina = Math.min(Math.max(1, Number(params.pagina ?? 1)), totalPaginas);
  const paginaSolicitacoes = solicitacoes.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const montarHrefPagina = (novaPagina: number) => `/horas-extras?${new URLSearchParams({ pagina: String(novaPagina), itensPorPagina: String(itensPorPagina) })}`;
  const politica = configuracao?.policies[0];
  const versao = politica?.versions[0];

  return <div className="space-y-3">
    <PageHeader icon={CalendarClock} titulo="Horas extras" contexto={<Breadcrumb embedded items={[{ label: "Horas extras" }]} />} variant="blade" />
    {erroConfiguracao ? <Card className="border-amber-200 bg-amber-50 text-amber-950"><CardContent className="pt-5 text-sm">{erroConfiguracao}</CardContent></Card> : null}
    {politica && versao ? <div className="border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Política ativa: {politica.name}.</strong> {versao.rateRules.length} regras e limite mensal de {formatarMinutos(versao.monthlyLimitMinutes ?? 0)}.</div> : null}
    <DataTableShell title="Solicitações" total={solicitacoes.length} pagina={pagina} totalPaginas={totalPaginas} itensPorPagina={itensPorPagina} montarHrefPagina={montarHrefPagina} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} novoHref="/horas-extras/nova" novoLabel="Nova solicitação" />}>
      <StandardDataTable
        columns={[{ key: "numero", label: "Solicitação" }, { key: "periodo", label: "Período" }, { key: "horas", label: "Horas" }, { key: "status", label: "Status" }]}
        rows={paginaSolicitacoes.map((solicitacao) => {
          const total = solicitacao.days.reduce((soma, dia) => soma + dia.requestedMinutes, 0);
          const rascunho = solicitacao.currentLifecycleStatus === "DRAFT";
          return { id: solicitacao.id, label: solicitacao.requestNumber, visualizarHref: rascunho ? `/horas-extras/nova?rascunho=${solicitacao.id}` : undefined, cells: {
            numero: { value: solicitacao.requestNumber }, periodo: { value: `${formatarData(solicitacao.periodStart)} a ${formatarData(solicitacao.periodEnd)}` }, horas: { value: formatarMinutos(total) }, status: { value: rotulosStatus[solicitacao.currentLifecycleStatus] ?? solicitacao.currentLifecycleStatus, tone: solicitacao.currentLifecycleStatus === "APPROVED" ? "success" : solicitacao.currentLifecycleStatus === "REJECTED" || solicitacao.currentLifecycleStatus === "CANCELLED" ? "danger" : "muted" },
          }, actionItems: rascunho ? <div className="px-1 py-1"><ExcluirRascunhoHorasExtrasButton action={excluirRascunhoHorasExtrasAction.bind(null, solicitacao.id)} requestNumber={solicitacao.requestNumber} /></div> : undefined };
        })}
        emptyMessage="Nenhuma solicitação de horas extras registrada para o perfil atual."
      />
    </DataTableShell>
  </div>;
}
