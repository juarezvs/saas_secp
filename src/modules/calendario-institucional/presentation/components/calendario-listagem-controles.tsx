import { DataTableToolbar, type DataTableFiltro } from "@/components/listagens";

export function CalendarioListagemControles({ tipos }: { tipos: Array<{ codigo: string; nome: string }> }) {
  const filtros: DataTableFiltro[] = [
    { tipo: "texto", nome: "busca", label: "Descricao", placeholder: "Buscar descricao" },
    { tipo: "select", nome: "tipo", label: "Tipo", options: [{ value: "", label: "Todos" }, ...tipos.map((tipo) => ({ value: tipo.codigo, label: tipo.nome }))] },
    { tipo: "select", nome: "status", label: "Status", options: [{ value: "", label: "Todos" }, { value: "ativo", label: "Ativos" }, { value: "inativo", label: "Inativos" }] },
    { tipo: "texto", nome: "ano", label: "Ano" },
    { tipo: "texto", nome: "mes", label: "Mes" },
  ];
  return <DataTableToolbar filtros={filtros} novoHref="/administracao/calendario/novo" novoLabel="Novo evento" editarHrefBase="/administracao/calendario" podeEditar />;
}
