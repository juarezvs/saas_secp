import Link from "next/link";
import { Download, FileText } from "lucide-react";

type DataTableExportButtonsProps = {
  csvHref: string;
  pdfHref: string;
};

export function DataTableExportButtons({
  csvHref,
  pdfHref,
}: DataTableExportButtonsProps) {
  const classes =
    "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={csvHref}
        className={classes}
        aria-label="Exportar lista em CSV com os filtros atuais"
      >
        <Download className="size-4" aria-hidden="true" />
        Exportar lista
      </Link>

      <Link
        href={pdfHref}
        className={classes}
        aria-label="Exportar lista em PDF com os filtros atuais"
      >
        <FileText className="size-4" aria-hidden="true" />
        Exportar PDF
      </Link>
    </div>
  );
}

