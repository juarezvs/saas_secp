import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
import { excluirAjusteManualBancoHorasAction } from "../../application/actions/excluir-ajuste-manual-banco-horas.action";
import { formatarDataCivilBancoHoras, minutosParaHoraBanco, rotuloOrigemMovimentoBancoHoras, rotuloSituacaoLoteBancoHoras, rotuloStatusMovimentoBancoHoras, rotuloTipoMovimentoBancoHoras } from "../../application/services/formatar-banco-horas.service";

type Movimento = { id: string; dataReferencia: Date; tipo: string; origem: string; status: string; minutos: number; descricao: string | null; expiraEm: Date | null; metadados?: unknown };
function excluivel(item: Movimento) { return item.origem === "AJUSTE_ADMINISTRATIVO" && !["ESTORNADO", "DESCONSIDERADO", "EXPIRADO"].includes(item.status); }
function objeto(valor: unknown) { return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : {}; }
function detalheLote(metadados: unknown) { const fifo = objeto(objeto(metadados).fifo); const alocacoes = Array.isArray(fifo.alocacoes) ? fifo.alocacoes.length : 0; if (alocacoes) return `${alocacoes} lote(s)`; if (typeof fifo.situacao !== "string") return "-"; return `${rotuloSituacaoLoteBancoHoras(fifo.situacao)} - restante ${minutosParaHoraBanco(Number(fifo.minutosRestantes ?? 0))}`; }
function detalheRegra(metadados: unknown) { const regra = objeto(objeto(metadados).regraBancoHoras); const fundamento = typeof regra.fundamento === "string" ? regra.fundamento : ""; const alertas = Array.isArray(regra.alertas) ? regra.alertas.filter((item): item is string => typeof item === "string").join("; ") : ""; return [fundamento, alertas].filter(Boolean).join(" - "); }

export function MovimentosBancoHorasTable({ movimentos, podeGerenciar = false }: { movimentos: Movimento[]; podeGerenciar?: boolean }) {
  return <DataTableShell title="Extrato da competência" description="Créditos, débitos, compensações e prazos registrados no mês." total={movimentos.length} pagina={1} totalPaginas={1} itensPorPagina={Math.max(movimentos.length, 10)} montarHrefPagina={() => "#"} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} />}>
    <StandardDataTable
      columns={[{ key: "data", label: "Data" }, { key: "tipo", label: "Tipo" }, { key: "origem", label: "Origem" }, { key: "horas", label: "Horas" }, { key: "status", label: "Status" }, { key: "expiracao", label: "Expiração" }, { key: "lote", label: "Lote" }, { key: "descricao", label: "Descrição" }]}
      rows={movimentos.map((item) => ({ id: item.id, label: item.descricao ?? rotuloTipoMovimentoBancoHoras(item.tipo), cells: {
        data: { value: formatarDataCivilBancoHoras(item.dataReferencia) }, tipo: { value: rotuloTipoMovimentoBancoHoras(item.tipo) }, origem: { value: rotuloOrigemMovimentoBancoHoras(item.origem) }, horas: { value: minutosParaHoraBanco(item.minutos) }, status: { value: rotuloStatusMovimentoBancoHoras(item.status), tone: item.status === "VALIDADO" ? "success" : item.status === "REJEITADO" ? "danger" : "muted" }, expiracao: { value: item.expiraEm ? formatarDataCivilBancoHoras(item.expiraEm) : "-" }, lote: { value: detalheLote(item.metadados) }, descricao: { value: item.descricao ?? "-", detail: detalheRegra(item.metadados) || undefined },
      }, actionItems: podeGerenciar && excluivel(item) ? <form action={excluirAjusteManualBancoHorasAction}><input type="hidden" name="movimentoId" value={item.id} /><button type="submit" className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-red-700 hover:bg-red-50">Excluir ajuste</button></form> : undefined }))}
      emptyMessage="Nenhum movimento encontrado para a competência selecionada."
      minWidth={1000}
    />
  </DataTableShell>;
}
