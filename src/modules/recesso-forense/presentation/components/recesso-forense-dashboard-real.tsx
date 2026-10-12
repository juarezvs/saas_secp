import Link from "next/link";
import { CalendarDays, CalendarRange } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell, DataTableToolbar, StandardDataTable, type StandardDataTableRow } from "@/components/listagens";
import { formatarDataRecesso, formatarPeriodoRecesso } from "../../application/services/recesso-forense.service";
import { excluirRecessoForenseAction } from "../../application/actions/recesso-forense.actions";
import { ExcluirRecessoForenseButton } from "./excluir-recesso-forense-button";

type RecessoResumo = { id: string; ano: number; dataInicio: Date; dataFim: Date; status: string; convocacoes?: unknown[]; convocados: Array<{ dataConvocacao: Date; escolha: string }>; homologacoes: Array<{ status: string }> };
type Props = { recessos: RecessoResumo[]; podeGerenciar: boolean; visualizacaoServidor?: boolean; podeGerenciarConvocacoes?: boolean };
const rotuloStatus: Record<string, string> = { RASCUNHO: "Rascunho", ABERTO: "Aberto", FECHADO: "Fechado", HOMOLOGADO: "Homologado", CONCLUIDO: "Concluido" };

export function RecessoForenseDashboardReal({ recessos, podeGerenciar, visualizacaoServidor = false, podeGerenciarConvocacoes = false }: Props) {
  const ativo = recessos[0];
  const datas = (recesso: RecessoResumo, escolha: string) => recesso.convocados.filter((item) => item.escolha === escolha).map((item) => formatarDataRecesso(item.dataConvocacao)).join(", ") || "-";
  return <div className="space-y-3">
    <PageHeader icon={CalendarRange} titulo="Recesso forense" contexto={<Breadcrumb embedded items={[{ label: "Recesso forense" }]} />} variant="blade" />
    <DataTableShell title="Recessos" total={recessos.length} pagina={1} totalPaginas={1} itensPorPagina={Math.max(recessos.length, 10)} montarHrefPagina={() => "/recesso-forense"} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} novoHref={podeGerenciar ? "/recesso-forense/novo" : undefined} novoLabel="Novo recesso" acoes={podeGerenciarConvocacoes && ativo ? [{ href: `/recesso-forense/${ativo.id}/convocacoes`, label: "Gerenciar convocações" }] : []} />}>
      <StandardDataTable
        columns={visualizacaoServidor ? [{ key: "ano", label: "Ano" }, { key: "periodo", label: "Período" }, { key: "status", label: "Status" }, { key: "pecunia", label: "Pecúnia" }, { key: "folga", label: "Folga" }] : [{ key: "ano", label: "Ano" }, { key: "periodo", label: "Período" }, { key: "status", label: "Status" }, { key: "convocacoes", label: "Convocações" }, { key: "dias", label: "Dias convocados" }, { key: "pendencias", label: "Pendências" }]}
        rows={recessos.map((recesso) => ({
          id: recesso.id, label: `Recesso ${recesso.ano}`, visualizarHref: visualizacaoServidor ? undefined : `/recesso-forense/${recesso.id}`,
          cells: (visualizacaoServidor ? { ano: { value: recesso.ano }, periodo: { value: formatarPeriodoRecesso(recesso.dataInicio, recesso.dataFim) }, status: { value: rotuloStatus[recesso.status] ?? recesso.status, tone: recesso.status === "CONCLUIDO" ? "success" : "muted" }, pecunia: { value: datas(recesso, "PECUNIA") }, folga: { value: datas(recesso, "FOLGA") } } : { ano: { value: recesso.ano }, periodo: { value: formatarPeriodoRecesso(recesso.dataInicio, recesso.dataFim) }, status: { value: rotuloStatus[recesso.status] ?? recesso.status, tone: recesso.status === "CONCLUIDO" ? "success" : "muted" }, convocacoes: { value: recesso.convocacoes?.length ?? 0 }, dias: { value: recesso.convocados.length }, pendencias: { value: recesso.homologacoes.filter((item) => item.status !== "ACEITO_SECAD").length } }) as StandardDataTableRow["cells"],
          actionItems: <>{podeGerenciarConvocacoes ? <Link href={`/recesso-forense/${recesso.id}/convocacoes`} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-[var(--muted)]"><CalendarDays className="size-3.5" />Gerenciar convocações</Link> : null}{podeGerenciar ? <div className="px-1 py-1"><ExcluirRecessoForenseButton action={excluirRecessoForenseAction} recessoId={recesso.id} ano={recesso.ano} /></div> : null}</>,
        }))}
        emptyMessage="Nenhum recesso cadastrado."
        minWidth={900}
      />
    </DataTableShell>
  </div>;
}
