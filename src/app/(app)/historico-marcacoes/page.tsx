import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarHistoricoMarcacoesDoUsuario } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";

type Props = { searchParams?: Promise<{ competencia?: string; anoReferencia?: string; mesReferencia?: string; pagina?: string; itensPorPagina?: string }> };

function normalizarCompetencia(params: Awaited<NonNullable<Props["searchParams"]>>) {
  const hoje = new Date();
  const match = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const ano = Number(match?.[1] ?? params.anoReferencia ?? hoje.getFullYear());
  const mes = Number(match?.[2] ?? params.mesReferencia ?? hoje.getMonth() + 1);
  return { ano: Number.isInteger(ano) ? ano : hoje.getFullYear(), mes: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : hoje.getMonth() + 1 };
}

const formatarData = (data: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
const formatarDia = (data: Date) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(data);

export default async function HistoricoMarcacoesPage({ searchParams }: Props) {
  const [permissao, params = {}] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(["marcacoes:consultar:proprio", "marcacoes:visualizar:proprio"]),
    searchParams,
  ]);
  const { ano, mes } = normalizarCompetencia(params);
  const competencia = `${ano}-${String(mes).padStart(2, "0")}`;
  const resultado = permissao.usuarioId
    ? await listarHistoricoMarcacoesDoUsuario({ usuarioId: permissao.usuarioId, anoReferencia: ano, mesReferencia: mes })
    : { servidor: null, marcacoes: [], apuracoes: [] };
  const itensPorPagina = Math.max(1, Number(params.itensPorPagina ?? 20));
  const totalPaginas = Math.max(1, Math.ceil(resultado.marcacoes.length / itensPorPagina));
  const pagina = Math.min(Math.max(1, Number(params.pagina ?? 1)), totalPaginas);
  const marcacoes = resultado.marcacoes.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const montarHrefPagina = (novaPagina: number) => `/historico-marcacoes?${new URLSearchParams({ competencia, pagina: String(novaPagina), itensPorPagina: String(itensPorPagina) })}`;

  return <div className="space-y-3">
    <PageHeader icon={Clock3} titulo="Histórico de marcações" contexto={<Breadcrumb embedded items={[{ label: "Histórico de marcações" }]} />} variant="blade" />
    <DataTableShell title="Marcações" description="Registros da competência selecionada" total={resultado.marcacoes.length} pagina={pagina} totalPaginas={totalPaginas} itensPorPagina={itensPorPagina} montarHrefPagina={montarHrefPagina} toolbar={<DataTableToolbar filtros={[{ nome: "competencia", label: "Competência", tipo: "competencia", defaultValue: competencia }]} />}>
      <StandardDataTable
        columns={[{ key: "data", label: "Data" }, { key: "dia", label: "Dia da semana" }, { key: "hora", label: "Hora" }, { key: "tipo", label: "Tipo" }, { key: "origem", label: "Origem" }, { key: "status", label: "Status" }]}
        rows={marcacoes.map((marcacao) => ({ id: marcacao.id, label: `${formatarData(marcacao.dataReferencia)} ${marcacao.tipo}`, cells: {
          data: { value: formatarData(marcacao.dataReferencia) },
          dia: { value: formatarDia(marcacao.dataReferencia) },
          hora: { value: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: marcacao.fusoHorario ?? "America/Manaus" }).format(marcacao.dataHora) },
          tipo: { value: marcacao.tipo }, origem: { value: marcacao.fonte ?? "-" },
          status: { value: marcacao.status, tone: marcacao.status === "VALIDA" ? "success" : marcacao.status === "CANCELADA" ? "danger" : "muted" },
        }, actionItems: marcacao.evidenciaFacial ? <a href={`/api/marcacoes/${marcacao.id}/evidencia-facial`} target="_blank" rel="noreferrer" className="block rounded-sm px-2 py-1.5 text-xs hover:bg-[var(--muted)]">Visualizar evidência facial</a> : undefined }))}
        emptyMessage="Nenhuma marcação encontrada na competência selecionada."
        minWidth={900}
      />
    </DataTableShell>
  </div>;
}
