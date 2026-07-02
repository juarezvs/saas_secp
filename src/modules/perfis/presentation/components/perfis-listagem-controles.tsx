import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type PerfisListagemControlesProps = {
  perfis: FiltroOption[];
  permissoes: FiltroOption[];
  exportCsvHref: string;
  exportPdfHref: string;
};

export function PerfisListagemControles({
  perfis,
  permissoes,
  exportCsvHref,
  exportPdfHref,
}: PerfisListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar imediatamente",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "codigo", label: "Codigo" },
    {
      tipo: "searchable-select",
      nome: "nome",
      label: "Nome",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar perfil...",
      options: [{ value: "", label: "Todos" }, ...perfis],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "permissao",
      label: "Permissao",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar permissao...",
      options: [{ value: "", label: "Todas" }, ...permissoes],
      className: "lg:col-span-2",
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "ativo", label: "Ativos" },
        { value: "inativo", label: "Inativos" },
      ],
    },
  ];

  return (
    <DataTableToolbar
      filtros={filtros}
      csvHref={exportCsvHref}
      pdfHref={exportPdfHref}
    />
  );
}
