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
  tipoUsuarioFixo?: string;
  exportCsvHref?: string;
  exportPdfHref?: string;
};

const rotulosPessoa: Record<string, { singular: string; plural: string }> = {
  SERVIDOR: { singular: "Servidor", plural: "Servidores" },
  ESTAGIARIO: { singular: "Estagiário", plural: "Estagiários" },
  PRESTADOR: { singular: "Prestador", plural: "Prestadores" },
  VOLUNTARIO: { singular: "Voluntário", plural: "Voluntários" },
};

export function ServidoresListagemControles({
  orgaos,
  servidores,
  lotacoes,
  tipoUsuarioFixo,
  exportCsvHref,
  exportPdfHref,
}: ServidoresListagemControlesProps) {
  const rotuloPessoa =
    rotulosPessoa[tipoUsuarioFixo ?? "SERVIDOR"] ?? rotulosPessoa.SERVIDOR;
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matrícula" },
    { tipo: "texto", nome: "cpf", label: "CPF" },
    {
      tipo: "searchable-select",
      nome: "nome",
      label: rotuloPessoa.singular,
      placeholder: "Todos",
      searchPlaceholder: `Pesquisar ${rotuloPessoa.singular.toLowerCase()}...`,
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
    ...(tipoUsuarioFixo
      ? []
      : [
          {
            tipo: "select" as const,
            nome: "tipoUsuario",
            label: "Tipo",
            options: [
              { value: "", label: "Servidores" },
              { value: "ESTAGIARIO", label: "Estagiários" },
              { value: "PRESTADOR", label: "Prestadores" },
              { value: "VOLUNTARIO", label: "Voluntários" },
            ],
          },
        ]),
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Órgão",
      options: [
        { value: "", label: "Todos" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
      ],
    },
    ...(tipoUsuarioFixo
      ? []
      : [
          {
            tipo: "select" as const,
            nome: "vinculo",
            label: "Vínculo",
            options: [
              { value: "", label: "Todos" },
              { value: "EFETIVO", label: "Efetivo" },
              { value: "CEDIDO", label: "Cedido" },
              { value: "REQUISITADO", label: "Requisitado" },
              { value: "REDISTRIBUIDO", label: "Redistribuído" },
              { value: "REMOVIDO", label: "Removido" },
              { value: "EXERCICIO_PROVISORIO", label: "Exercício provisório" },
            ],
          },
          {
            tipo: "select" as const,
            nome: "status",
            label: "Status",
            defaultValue: "ativo",
            options: [
              { value: "", label: "Todos" },
              { value: "ativo", label: "Ativos" },
              { value: "inativo", label: "Inativos" },
            ],
          },
        ]),
  ];

  return (
    <DataTableToolbar
      filtros={filtros}
      csvHref={exportCsvHref}
      pdfHref={exportPdfHref}
    />
  );
}
