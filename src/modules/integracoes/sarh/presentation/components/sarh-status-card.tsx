type SarhStatusCardProps = {
  titulo: string;
  valor: string | number;
  descricao?: string;
};

export function SarhStatusCard({ titulo, valor, descricao }: SarhStatusCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{valor}</p>
      {descricao ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{descricao}</p> : null}
    </div>
  );
}
