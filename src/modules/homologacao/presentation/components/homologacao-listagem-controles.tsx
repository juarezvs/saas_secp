import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type HomologacaoListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function HomologacaoListagemControles({
  exportCsvHref,
  exportPdfHref,
}: HomologacaoListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Unidade ou responsável",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "competencia", nome: "competencia", label: "Competência" },
    { tipo: "texto", nome: "unidade", label: "Unidade" },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "ABERTO", label: "Aberto" },
        { value: "EM_HOMOLOGACAO", label: "Em homologação" },
        { value: "HOMOLOGADO", label: "Homologado" },
        { value: "HOMOLOGADO_PARCIAL", label: "Homologado parcial" },
        { value: "CANCELADO", label: "Cancelado" },
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
