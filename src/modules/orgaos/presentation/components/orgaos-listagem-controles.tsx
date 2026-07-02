import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type OrgaosListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
  fusosHorarios?: {
    valor: string;
    rotulo: string;
  }[];
};

export function OrgaosListagemControles({
  exportCsvHref,
  exportPdfHref,
  fusosHorarios = [],
}: OrgaosListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar imediatamente",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "sigla", label: "Sigla" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    {
      tipo: "texto",
      nome: "codigoExternoSarh",
      label: "Codigo SARH",
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
    {
      tipo: "select",
      nome: "fusoHorario",
      label: "Fuso",
      options: [
        { value: "", label: "Todos" },
        ...fusosHorarios.map((fuso) => ({
          value: fuso.valor,
          label: fuso.rotulo,
        })),
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
