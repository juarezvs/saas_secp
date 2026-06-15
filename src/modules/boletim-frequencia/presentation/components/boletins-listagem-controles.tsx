import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type BoletinsListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function BoletinsListagemControles({
  exportCsvHref,
  exportPdfHref,
}: BoletinsListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Unidade, processo SEI ou responsável",
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
        { value: "GERADO", label: "Gerado" },
        { value: "ENCAMINHADO_SECAP", label: "Encaminhado SECAP" },
        { value: "RECEBIDO_SECAP", label: "Recebido SECAP" },
        { value: "CONFERIDO", label: "Conferido" },
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
