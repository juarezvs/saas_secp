import { DataTableToolbar, type DataTableFiltro } from "@/components/listagens";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";

type BoletinsListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
  unidades: {
    value: string;
    label: string;
    searchText?: string;
    grupo?: string;
  }[];
};

export function BoletinsListagemControles({
  exportCsvHref,
  exportPdfHref,
  unidades,
}: BoletinsListagemControlesProps) {
  const filtros: DataTableFiltro[] = [
    {
      tipo: "texto",
      nome: "busca",
      label: "Consulta geral",
      placeholder: "Unidade, processo SEI ou responsável",
      className: "lg:col-span-2",
      comIconeBusca: true,
    },
    { tipo: "competencia", nome: "competencia", label: "Competência" },
    {
      tipo: "searchable-select",
      nome: "unidadeId",
      label: "Unidade",
      placeholder: "Todas as unidades",
      searchPlaceholder: "Pesquisar unidade...",
      options: [{ value: "", label: "Todas as unidades" }, ...unidades],
    },
    {
      tipo: "select",
      nome: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "GERADO", label: "Gerado" },
        { value: "ENCAMINHADO_SECAP", label: "Encaminhado SECAP" },
        { value: "RECEBIDO_SECAP", label: "Recebido SECAP" },
        { value: "CONFERIDO", label: "Conferido" },
        { value: "CANCELADO", label: "Cancelado" },
      ],
    },
  ];
  const classesExportacao =
    "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <RelatorioExportacaoButton
          href={exportCsvHref}
          className={classesExportacao}
          modo="auto"
        >
          Exportar lista
        </RelatorioExportacaoButton>

        <RelatorioExportacaoButton
          href={exportPdfHref}
          className={classesExportacao}
          modo="auto"
        >
          Exportar Boletim da Unidade
        </RelatorioExportacaoButton>
      </div>

      <DataTableToolbar filtros={filtros} />
    </div>
  );
}
