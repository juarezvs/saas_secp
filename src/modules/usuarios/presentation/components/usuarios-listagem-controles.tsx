import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type UsuariosListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function UsuariosListagemControles({
  exportCsvHref,
  exportPdfHref,
}: UsuariosListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Consulta aplicada após 3 segundos",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "texto", nome: "matricula", label: "Matrícula" },
    { tipo: "texto", nome: "nome", label: "Nome" },
    { tipo: "texto", nome: "email", label: "E-mail" },
    { tipo: "texto", nome: "lotacao", label: "Lotação" },
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
