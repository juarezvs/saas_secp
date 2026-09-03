import { Download } from "lucide-react";

import type { NadaConstaFrequenciaResumo } from "../../application/actions/emitir-nada-consta-frequencia.action";

export function NadaConstaPdfButton({
  resumo,
  className = "",
  label = "PDF",
}: {
  resumo: NadaConstaFrequenciaResumo;
  emitidoEm?: Date | string | null;
  processoSei?: string | null;
  className?: string;
  label?: string;
}) {
  if (!resumo.execucaoId) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-2 rounded-md border px-3 text-sm font-bold text-[var(--muted-foreground)] opacity-60 ${className}`}
      >
        <Download className="size-4" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <a
      href={`/api/procedimentos-frequencia/nada-consta/${resumo.execucaoId}/pdf`}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-bold text-blue-900 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${className}`}
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </a>
  );
}
