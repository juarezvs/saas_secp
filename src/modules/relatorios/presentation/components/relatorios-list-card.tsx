import Link from "next/link";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { DataTableShell, DataTableToolbar, StandardDataTable, type StandardDataTableRow } from "@/components/listagens";
import { RelatorioExportacaoButton } from "./relatorio-exportacao-button";

type BoletimRelatorioItem = { id: string; anoReferencia: number; mesReferencia: number; status: string; unidade: { sigla: string; nome: string } };
type Relatorio = { id: string; nome: string; categoria: string; descricao: string; formato: string; href: string | null; assincrono?: boolean; status?: string };

export function RelatoriosListCard({ servidorId, ano, mes, boletins, controles, mostrarGerenciais, mostrarLotacoesChefias }: { servidorId: string | null; ano: number; mes: number; boletins: BoletimRelatorioItem[]; controles?: ReactNode; mostrarGerenciais: boolean; mostrarLotacoesChefias: boolean }) {
  const query = new URLSearchParams({ ano: String(ano), mes: String(mes) });
  if (servidorId) query.set("servidorId", servidorId);
  const queryHoras = new URLSearchParams({ competencia: `${ano}-${String(mes).padStart(2, "0")}` });
  const relatorios: Relatorio[] = [
    { id: "espelho", nome: "Espelho de ponto", categoria: "Individual", descricao: "Apurações diárias, créditos, débitos e status.", formato: "PDF", href: servidorId ? `/api/relatorios/espelho/${servidorId}/pdf?ano=${ano}&mes=${mes}` : null, assincrono: true },
    { id: "banco", nome: "Banco de horas", categoria: "Individual", descricao: "Saldo consolidado e movimentos do banco de horas.", formato: "PDF", href: servidorId ? `/api/relatorios/banco-horas/${servidorId}/pdf?ano=${ano}&mes=${mes}` : null, assincrono: true },
  ];
  if (mostrarGerenciais) relatorios.push(
    { id: "he-banco", nome: "Horas extras e banco de horas", categoria: "Gerencial", descricao: "Créditos, débitos e saldo por servidor.", formato: "PDF", href: `/api/relatorios/gerenciais/horas-extras-banco-horas/pdf?${query}`, assincrono: true },
    { id: "he-analitico", nome: "Horas extras analítico", categoria: "Gerencial", descricao: "Detalhamento por autorização, servidor, rubrica e valor.", formato: "CSV", href: `/api/horas-extras/relatorios/analitico?${queryHoras}` },
    { id: "he-sintetico", nome: "Horas extras sintético", categoria: "Gerencial", descricao: "Consolidado por servidor, competência, minutos e valor.", formato: "CSV", href: `/api/horas-extras/relatorios/sintetico?${queryHoras}` },
    { id: "absenteismo", nome: "Absenteismo", categoria: "Gerencial", descricao: "Faltas, dias com debito e inconsistencias.", formato: "PDF", href: `/api/relatorios/gerenciais/absenteismo/pdf?${query}`, assincrono: true },
    { id: "jornada", nome: "Jornada trabalhada", categoria: "Gerencial", descricao: "Carga prevista, tempo trabalhado e percentual realizado.", formato: "PDF", href: `/api/relatorios/gerenciais/jornada-trabalhada/pdf?${query}`, assincrono: true },
  );
  if (mostrarLotacoesChefias) relatorios.push({ id: "lotacoes", nome: "Lotacoes com chefias", categoria: "Gerencial", descricao: "Unidades ativas com chefia ou substituto registrado.", formato: "PDF", href: "/api/relatorios/gerenciais/lotacoes-chefias/pdf", assincrono: true });
  relatorios.push(...boletins.map((boletim) => ({ id: boletim.id, nome: `${boletim.unidade.sigla} - ${String(boletim.mesReferencia).padStart(2, "0")}/${boletim.anoReferencia}`, categoria: "Boletim de frequencia", descricao: boletim.unidade.nome, formato: "PDF", href: `/api/relatorios/boletim/${boletim.id}/pdf`, assincrono: true, status: boletim.status })));
  const rows: StandardDataTableRow[] = relatorios.map((relatorio) => ({ id: relatorio.id, label: relatorio.nome, cells: { nome: { value: relatorio.nome, detail: relatorio.descricao }, categoria: { value: relatorio.categoria }, competencia: { value: `${String(mes).padStart(2, "0")}/${ano}` }, formato: { value: relatorio.formato }, status: { value: relatorio.href ? (relatorio.status ?? "Disponível") : "Selecione um servidor", tone: relatorio.href ? "success" : "muted" } }, actionItems: relatorio.href ? relatorio.assincrono ? <div className="px-1 py-1"><RelatorioExportacaoButton href={relatorio.href} /></div> : <Link href={relatorio.href} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-[var(--muted)]"><Download className="size-3.5" />Exportar {relatorio.formato}</Link> : undefined }));
  return <DataTableShell title="Relatórios" total={rows.length} pagina={1} totalPaginas={1} itensPorPagina={Math.max(rows.length, 10)} montarHrefPagina={() => "/relatorios"} toolbar={<DataTableToolbar filtros={[]} mostrarFiltros={false} acoesInicio={controles} />}>
    <StandardDataTable columns={[{ key: "nome", label: "Relatório" }, { key: "categoria", label: "Categoria" }, { key: "competencia", label: "Competência" }, { key: "formato", label: "Formato" }, { key: "status", label: "Status" }]} rows={rows} emptyMessage="Nenhum relatório disponível." minWidth={940} />
  </DataTableShell>;
}
