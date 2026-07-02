import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type FiltroOption = {
  value: string;
  label: string;
  searchText?: string;
};

type UsuariosListagemControlesProps = {
  servidores: FiltroOption[];
  lotacoes: FiltroOption[];
  exportCsvHref: string;
  exportPdfHref: string;
};

export function UsuariosListagemControles({
  servidores,
  lotacoes,
  exportCsvHref,
  exportPdfHref,
}: UsuariosListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Pesquisar imediatamente",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matricula" },
    {
      tipo: "searchable-select",
      nome: "nome",
      label: "Servidor",
      placeholder: "Todos",
      searchPlaceholder: "Pesquisar servidor...",
      options: [{ value: "", label: "Todos" }, ...servidores],
      className: "lg:col-span-2",
    },
    { tipo: "texto", nome: "email", label: "E-mail" },
    {
      tipo: "searchable-select",
      nome: "lotacao",
      label: "Lotacao",
      placeholder: "Todas",
      searchPlaceholder: "Pesquisar lotacao...",
      options: [{ value: "", label: "Todas" }, ...lotacoes],
    },
    { tipo: "texto", nome: "perfil", label: "Perfil" },
    {
      tipo: "select",
      nome: "tipo",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "SERVIDOR", label: "Servidor" },
        { value: "SISTEMA", label: "Sistema" },
        { value: "PESSOA_EXTERNA", label: "Pessoa externa" },
        { value: "PRESTADOR", label: "Prestador" },
        { value: "ESTAGIARIO", label: "Estagiario" },
        { value: "VOLUNTARIO", label: "Voluntario" },
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
