import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type OrgaoOption = {
  id: string;
  sigla: string;
};

type UnidadesListagemControlesProps = {
  orgaos: OrgaoOption[];
  exportCsvHref: string;
  exportPdfHref: string;
};

export function UnidadesListagemControles({
  orgaos,
  exportCsvHref,
  exportPdfHref,
}: UnidadesListagemControlesProps) {
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
    { tipo: "texto", nome: "superior", label: "Superior" },
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
      nome: "tipo",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "ORGAO", label: "Orgao" },
        { value: "SECAO_JUDICIARIA", label: "Secao Judiciaria" },
        { value: "SUBSECAO_JUDICIARIA", label: "Subsecao Judiciaria" },
        {
          value: "UNIDADE_AVANCADA_ATENDIMENTO",
          label: "Unidade avancada de atendimento",
        },
        { value: "NUCLEO", label: "Nucleo" },
        { value: "SECAO", label: "Secao" },
        { value: "SECRETARIA", label: "Secretaria" },
        { value: "VARA", label: "Vara" },
        { value: "GABINETE", label: "Gabinete" },
        { value: "TURMA_RECURSAL", label: "Turma recursal" },
        { value: "CENTRO_CONCILIACAO", label: "Centro de conciliacao" },
        { value: "DEPARTAMENTO", label: "Departamento" },
        { value: "SUBDEPARTAMENTO", label: "Subdepartamento" },
        { value: "OUTRA", label: "Outra" },
      ],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      defaultValue: "ativa",
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
