import {
  DataTableToolbar,
  type DataTableFiltro,
} from "@/components/listagens";

type IntegracoesListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
};

export function IntegracoesListagemControles({
  exportCsvHref,
  exportPdfHref,
}: IntegracoesListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Nome, descricao, URL ou erro",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    {
      tipo: "select",
      nome: "tipo",
      label: "Tipo",
      options: [
        { value: "", label: "Todos" },
        { value: "SARH", label: "SARH" },
        { value: "SEI", label: "SEI" },
        { value: "EQUIPAMENTO_BIOMETRICO", label: "Equipamento biometrico" },
        { value: "LDAP", label: "LDAP" },
        { value: "WEBHOOK", label: "Webhook" },
        { value: "OUTRO", label: "Outro" },
      ],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "ATIVA", label: "Ativa" },
        { value: "INATIVA", label: "Inativa" },
        { value: "ERRO", label: "Erro" },
        { value: "NAO_CONFIGURADA", label: "Nao configurada" },
      ],
    },
    {
      tipo: "select",
      nome: "direcao",
      label: "Direcao",
      options: [
        { value: "", label: "Todas" },
        { value: "ENTRADA", label: "Entrada" },
        { value: "SAIDA", label: "Saida" },
        { value: "BIDIRECIONAL", label: "Bidirecional" },
      ],
    },
    {
      tipo: "select",
      nome: "ativo",
      label: "Ativa",
      options: [
        { value: "", label: "Todas" },
        { value: "true", label: "Sim" },
        { value: "false", label: "Nao" },
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
