import { Scale } from "lucide-react";

type RegraPortariaCardProps = {
  artigo: string;
  titulo: string;
  descricao: string;
};

export function RegraPortariaCard({
  artigo,
  titulo,
  descricao,
}: RegraPortariaCardProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Base normativa: ${artigo}`}
        className="secp-theme-icon inline-flex size-8 items-center justify-center rounded-md border transition hover:bg-[var(--secp-theme-accent-soft-hover)] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Scale className="size-4" aria-hidden="true" />
      </button>

      <span className="pointer-events-none absolute left-1/2 top-9 z-50 hidden w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border bg-[var(--card)] p-3 text-left text-[var(--card-foreground)] shadow-xl group-hover:block group-focus-within:block">
        <span className="block text-xs font-bold uppercase tracking-wide text-[var(--secp-theme-accent)]">
          Base normativa — {artigo}
        </span>

        <span className="mt-1 block text-sm font-bold">{titulo}</span>

        <span className="mt-2 block text-sm leading-5 text-slate-700 dark:text-slate-300">
          {descricao}
        </span>
      </span>
    </span>
  );
}
