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
        className="secp-theme-icon inline-flex size-9 animate-pulse items-center justify-center rounded-full border border-secp-blue-900/20 shadow-sm transition hover:animate-none hover:bg-secp-blue-900/15 focus:outline-none focus:ring-2 focus:ring-ring dark:border-white/15 dark:hover:bg-white/10"
      >
        <Scale className="size-5" aria-hidden="true" />
      </button>

      <span className="pointer-events-none absolute left-1/2 top-11 z-50 hidden w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-blue-100 bg-white p-4 text-left text-blue-950 shadow-xl group-hover:block group-focus-within:block dark:border-blue-900 dark:bg-slate-950 dark:text-blue-100">
        <span className="block text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-300">
          Base normativa — {artigo}
        </span>

        <span className="mt-1 block text-sm font-bold">{titulo}</span>

        <span className="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-300">
          {descricao}
        </span>
      </span>
    </span>
  );
}
