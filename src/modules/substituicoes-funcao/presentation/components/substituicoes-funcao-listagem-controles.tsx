import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type SubstituicoesFuncaoListagemControlesProps = {
  orgaos: Array<{
    id: string;
    sigla: string;
  }>;
  titulares: FiltroOption[];
  substitutos: FiltroOption[];
  funcoes: FiltroOption[];
};

export function SubstituicoesFuncaoListagemControles({
  orgaos,
  titulares,
  substitutos,
  funcoes,
}: SubstituicoesFuncaoListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "select",
      nome: "orgaoId",
      label: "Seccional",
      options: [
        { value: "", label: "Todas" },
        ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
      ],
    },
    {
      tipo: "searchable-select",
      nome: "titularServidorId",
      label: "Titular",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar por matricula ou nome...",
      options: [{ value: "", label: "Todos" }, ...titulares],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "substitutoServidorId",
      label: "Substituto",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar por matricula ou nome...",
      options: [{ value: "", label: "Todos" }, ...substitutos],
      className: "lg:col-span-2",
    },
    {
      tipo: "searchable-select",
      nome: "funcaoId",
      label: "Funcao",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar por categoria, codigo ou descricao...",
      options: [{ value: "", label: "Todas" }, ...funcoes],
      className: "lg:col-span-2",
    },
    {
      tipo: "data",
      nome: "dataInicio",
      label: "Vigencia inicio",
    },
    {
      tipo: "data",
      nome: "dataFim",
      label: "Vigencia fim",
    },
  ];

  return <DataTableToolbar filtros={filtros} />;
}
