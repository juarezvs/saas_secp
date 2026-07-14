import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";

type DataTableExportButtonsProps = {
  csvHref: string;
  pdfHref: string;
  csvAssincrono?: boolean;
  pdfAssincrono?: boolean;
};

export function DataTableExportButtons({
  csvHref,
  pdfHref,
  csvAssincrono = false,
  pdfAssincrono = false,
}: DataTableExportButtonsProps) {
  const classes =
    "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="flex flex-wrap gap-2">
      {csvAssincrono ? (
        <RelatorioExportacaoButton href={csvHref} className={classes}>
          Exportar lista
        </RelatorioExportacaoButton>
      ) : (
        <RelatorioExportacaoButton
          href={csvHref}
          className={classes}
          modo="auto"
        >
          Exportar lista
        </RelatorioExportacaoButton>
      )}

      {pdfAssincrono ? (
        <RelatorioExportacaoButton href={pdfHref} className={classes}>
          Exportar PDF
        </RelatorioExportacaoButton>
      ) : (
        <RelatorioExportacaoButton
          href={pdfHref}
          className={classes}
          modo="auto"
        >
          Exportar PDF
        </RelatorioExportacaoButton>
      )}
    </div>
  );
}

