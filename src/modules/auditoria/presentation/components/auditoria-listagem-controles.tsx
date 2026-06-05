import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type UsuarioFiltro = {
  id: string;
  nome: string;
  matricula: string;
};

type AuditoriaListagemControlesProps = {
  usuarios: UsuarioFiltro[];
  entidades: string[];
  exportCsvHref: string;
  exportPdfHref: string;
};

export function AuditoriaListagemControles({
  usuarios,
  entidades,
  exportCsvHref,
  exportPdfHref,
}: AuditoriaListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Acao, entidade, usuario ou ID",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    {
      tipo: "select",
      nome: "entidade",
      label: "Entidade",
      options: [
        { value: "", label: "Todas" },
        ...entidades.map((entidade) => ({ value: entidade, label: entidade })),
      ],
    },
    { tipo: "texto", nome: "acao", label: "Acao" },
    {
      tipo: "select",
      nome: "usuarioId",
      label: "Usuario",
      options: [
        { value: "", label: "Todos" },
        ...usuarios.map((usuario) => ({
          value: usuario.id,
          label: `${usuario.matricula} - ${usuario.nome}`,
        })),
      ],
    },
    {
      tipo: "texto",
      nome: "dataInicio",
      label: "Data inicio",
      placeholder: "AAAA-MM-DD",
    },
    {
      tipo: "texto",
      nome: "dataFim",
      label: "Data fim",
      placeholder: "AAAA-MM-DD",
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
