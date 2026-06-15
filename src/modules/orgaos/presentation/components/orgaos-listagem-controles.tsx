import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type OrgaosListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function OrgaosListagemControles({
  exportCsvHref,
  exportPdfHref,
}: OrgaosListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Consulta aplicada após 3 segundos",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "sigla", label: "Sigla" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    {
      tipo: "texto",
      nome: "codigoExternoSarh",
      label: "Código SARH",
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
