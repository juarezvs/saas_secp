import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type OrgaoOption = {
  id: string;
  sigla: string;
};

type ServidoresListagemControlesProps = {
  orgaos: OrgaoOption[];
  exportCsvHref: string;
  exportPdfHref: string;
};

export function ServidoresListagemControles({
  orgaos,
  exportCsvHref,
  exportPdfHref,
}: ServidoresListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Consulta aplicada apos 3 segundos",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matricula" },
    { tipo: "texto", nome: "cpf", label: "CPF" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    { tipo: "texto", nome: "lotacao", label: "Lotacao" },
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Orgao",
      options: [
        { value: "", label: "Todos" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
      ],
    },
    {
      tipo: "select",
      nome: "vinculo",
      label: "Vinculo",
      options: [
        { value: "", label: "Todos" },
        { value: "EFETIVO", label: "Efetivo" },
        { value: "CEDIDO", label: "Cedido" },
        { value: "REQUISITADO", label: "Requisitado" },
        { value: "REDISTRIBUIDO", label: "Redistribuido" },
        { value: "REMOVIDO", label: "Removido" },
        { value: "EXERCICIO_PROVISORIO", label: "Exercicio provisorio" },
      ],
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
