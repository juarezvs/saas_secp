import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type JornadasListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function JornadasListagemControles({
  exportCsvHref,
  exportPdfHref,
}: JornadasListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Consulta aplicada após 3 segundos",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "codigo", label: "Código" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    {
      tipo: "select",
      nome: "tipo",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "SETE_HORAS", label: "7 horas" },
        { value: "OITO_HORAS", label: "8 horas" },
        { value: "ESPECIAL", label: "Especial" },
      ],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "ativa", label: "Ativas" },
        { value: "inativa", label: "Inativas" },
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
