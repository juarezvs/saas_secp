import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
import { CopiarProcessoButton } from "./copiar-processo-button";

type AfastamentoItem = { id: string; categoria: string; tipoDescricao: string | null; dataInicio: Date; dataFim: Date | null; dias: number | null; processo: string | null; observacao: string | null; origemTabela: string; ativo: boolean; tipoAfastamento?: { descricao: string; categoria: string } | null };
type Props = { afastamentos: AfastamentoItem[]; titulo?: string; descricao?: string; mostrarResumo?: boolean; resumo?: { total: number; vigentes: number; futuros: number }; paginacao?: { total: number; pagina: number; totalPaginas: number; itensPorPagina: number; montarHrefPagina: (pagina: number) => string } };

const formatarData = (data: Date | null) => data ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data) : "Em aberto";
function status(item: AfastamentoItem) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(item.dataInicio); inicio.setHours(0, 0, 0, 0);
  const fim = item.dataFim ? new Date(item.dataFim) : null; fim?.setHours(0, 0, 0, 0);
  if (!item.ativo) return { label: "Inativo", tone: "muted" as const };
  if (inicio > hoje) return { label: "Futuro", tone: "muted" as const };
  if (!fim || fim >= hoje) return { label: "Vigente", tone: "success" as const };
  return { label: "Encerrado", tone: "muted" as const };
}

export function AfastamentosServidorCard({ afastamentos, titulo = "Afastamentos", descricao, resumo, paginacao }: Props) {
  const total = resumo?.total ?? paginacao?.total ?? afastamentos.length;
  const pagina = paginacao?.pagina ?? 1;
  const totalPaginas = paginacao?.totalPaginas ?? 1;
  const itensPorPagina = paginacao?.itensPorPagina ?? Math.max(afastamentos.length, 10);
  const montarHrefPagina = paginacao?.montarHrefPagina ?? (() => "#");
  return <DataTableShell title={titulo} description={descricao} total={total} pagina={pagina} totalPaginas={totalPaginas} itensPorPagina={itensPorPagina} montarHrefPagina={montarHrefPagina} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} />}>
    <StandardDataTable
      columns={[{ key: "tipo", label: "Tipo" }, { key: "categoria", label: "Categoria" }, { key: "periodo", label: "Periodo" }, { key: "dias", label: "Dias" }, { key: "processo", label: "Processo" }, { key: "status", label: "Status" }]}
      rows={afastamentos.map((item) => { const situacao = status(item); const tipo = item.tipoDescricao ?? item.tipoAfastamento?.descricao ?? item.categoria; return {
        id: item.id, label: tipo, cells: {
          tipo: { value: tipo, detail: item.observacao ?? undefined }, categoria: { value: item.categoria },
          periodo: { value: `${formatarData(item.dataInicio)} a ${formatarData(item.dataFim)}` }, dias: { value: item.dias ?? "-" },
          processo: { value: item.processo ?? "-" }, status: { value: situacao.label, tone: situacao.tone },
        }, actionItems: item.processo ? <div className="px-2 py-1"><CopiarProcessoButton processo={item.processo} /></div> : undefined,
      }; })}
      emptyMessage="Nenhum afastamento encontrado."
      minWidth={860}
    />
  </DataTableShell>;
}
