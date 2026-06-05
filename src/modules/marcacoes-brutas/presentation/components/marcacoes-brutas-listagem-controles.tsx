import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type MarcacoesBrutasListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function MarcacoesBrutasListagemControles({
  exportCsvHref,
  exportPdfHref,
}: MarcacoesBrutasListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "CPF, matricula, equipamento, NSR...",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    {
      tipo: "select",
      nome: "origem",
      label: "Origem",
      options: [
        { value: "", label: "Todas" },
        { value: "EQUIPAMENTO_BIOMETRICO", label: "Equipamento biometrico" },
        { value: "IMPORTACAO_AFD", label: "Importacao AFD" },
        { value: "WEB_AUTORIZADO", label: "Web autorizado" },
        { value: "FACIAL_AUTORIZADO", label: "Facial autorizado" },
      ],
    },
    {
      tipo: "select",
      nome: "processada",
      label: "Processamento",
      options: [
        { value: "", label: "Todos" },
        { value: "true", label: "Processadas" },
        { value: "false", label: "Pendentes" },
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
