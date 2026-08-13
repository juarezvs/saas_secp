import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type MarcacoesBrutasListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
  pessoas: FiltroOption[];
  equipamentos: FiltroOption[];
  orgaos: Array<{
    id: string;
    sigla: string;
  }>;
};

export function MarcacoesBrutasListagemControles({
  exportCsvHref,
  exportPdfHref,
  pessoas,
  equipamentos,
  orgaos,
}: MarcacoesBrutasListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "data",
      nome: "dataInicio",
      label: "Inicio",
    },
    {
      tipo: "data",
      nome: "dataFim",
      label: "Fim",
    },
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "CPF, matricula, equipamento, NSR...",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "cpf", label: "CPF" },
    { tipo: "texto", nome: "matricula", label: "Matricula" },
    {
      tipo: "searchable-select",
      nome: "servidorId",
      label: "Pessoa",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar por matricula ou nome...",
      options: [{ value: "", label: "Todas" }, ...pessoas],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "equipamentoCodigo",
      label: "Equipamento",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar por codigo, nome ou serie...",
      options: [{ value: "", label: "Todos" }, ...equipamentos],
      className: "lg:col-span-2",
    },
    { tipo: "texto", nome: "nsr", label: "NSR" },
    {
      tipo: "select",
      nome: "origem",
      label: "Origem",
      options: [
        { value: "", label: "Todas" },
        { value: "EQUIPAMENTO_BIOMETRICO", label: "Equipamento biometrico" },
        { value: "IMPORTACAO_AFD", label: "Importacao AFD" },
        { value: "WEB_AUTORIZADO", label: "Web autorizado" },
        {
          value: "FACIAL_AUTORIZADO",
          label: "Reconhecimento facial individual",
        },
        { value: "TOTEM_FACIAL_SECP", label: "TOTEM_FACIAL_SECP" },
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
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Seccional",
      options: [
        { value: "", label: "Todas" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
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
