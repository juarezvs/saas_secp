import Link from "next/link";
import { Download, FileText } from "lucide-react";

export function ExportarListaButton({
  href,
  tipo = "csv",
}: {
  href: string;
  tipo?: "csv" | "pdf";
}) {
  const Icon = tipo === "pdf" ? FileText : Download;

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
    >
      <Icon className="size-4" aria-hidden="true" />
      {tipo === "pdf" ? "Exportar PDF" : "Exportar lista"}
    </Link>
  );
}
