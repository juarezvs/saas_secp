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
    { tipo: "texto", nome: "nome", label: "Descrição" },
    {
      tipo: "select",
      nome: "tipo",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "FIXA_SEMANAL", label: "Semanal" },
        { value: "HIBRIDO", label: "Híbrido" },
        { value: "TELETRABALHO", label: "Teletrabalho" },
        { value: "ESCALA_CICLICA", label: "Escala cíclica" },
        {
          value: "CARGA_MENSAL",
          label: "Escala mensal - horário padrão",
        },
      ],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "ativa", label: "Ativos" },
        { value: "inativa", label: "Inativos" },
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
