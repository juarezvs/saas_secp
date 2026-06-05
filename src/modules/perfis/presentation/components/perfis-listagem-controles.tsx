import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type PerfisListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function PerfisListagemControles({
  exportCsvHref,
  exportPdfHref,
}: PerfisListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Consulta aplicada apos 3 segundos",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "codigo", label: "Codigo" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    { tipo: "texto", nome: "permissao", label: "Permissao" },
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
