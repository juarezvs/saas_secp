import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type OrgaoOption = {
  id: string;
  sigla: string;
};

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type ServidoresListagemControlesProps = {
  orgaos: OrgaoOption[];
  servidores: FiltroOption[];
  lotacoes: FiltroOption[];
  exportCsvHref?: string;
  exportPdfHref?: string;
};

export function ServidoresListagemControles({
  orgaos,
  servidores,
  lotacoes,
  exportCsvHref,
  exportPdfHref,
}: ServidoresListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar imediatamente",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matrícula" },
    { tipo: "texto", nome: "cpf", label: "CPF" },
    {
      tipo: "searchable-select",
      nome: "nome",
      label: "Servidor",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar servidor...",
      options: [{ value: "", label: "Todos" }, ...servidores],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "lotacao",
      label: "Lotação",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar lotação...",
      options: [{ value: "", label: "Todas" }, ...lotacoes],
    },
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Órgão",
      options: [
        { value: "", label: "Todos" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
      ],
    },
    {
      tipo: "select",
      nome: "vinculo",
      label: "Vínculo",
      options: [
        { value: "", label: "Todos" },
        { value: "EFETIVO", label: "Efetivo" },
        { value: "CEDIDO", label: "Cedido" },
        { value: "REQUISITADO", label: "Requisitado" },
        { value: "REDISTRIBUIDO", label: "Redistribuido" },
        { value: "REMOVIDO", label: "Removido" },
        { value: "EXERCICIO_PROVISORIO", label: "Exercício provisório" },
      ],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      defaultValue: "ativo",
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
