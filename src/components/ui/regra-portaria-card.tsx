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
    <aside className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <div className="flex gap-3">
        <div className="mt-1 rounded-lg bg-white p-2 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
          <Scale className="size-5" aria-hidden="true" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide">
            Base normativa — {artigo}
          </p>
          <h2 className="mt-1 text-base font-bold">{titulo}</h2>
          <p className="mt-2 text-sm leading-6">{descricao}</p>
        </div>
      </div>
    </aside>
  );
}
