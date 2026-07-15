import { Clock3 } from "lucide-react";

import { obterRotuloTipoMarcacao } from "../../application/services/classificar-marcacao.service";
import { formatarHoraPtBr } from "../../application/services/data-marcacao.service";
import { OrigemMarcacaoIcon } from "./origem-marcacao-icon";

type MarcacaoDiaItem = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte: string;
  status: string;
  observacao: string | null;
  fusoHorario?: string | null;
};

export function MarcacoesDiaCard({
  marcacoes,
}: {
  marcacoes: MarcacaoDiaItem[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-[var(--muted)]/35 p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Registro do dia</h2>
        </div>
        <span className="rounded-full border bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {marcacoes.length} registro{marcacoes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {marcacoes.map((marcacao) => (
          <div
            key={marcacao.id}
            className="grid gap-4 rounded-lg border bg-[var(--card)] p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:hover:border-blue-900"
          >
            <div className="relative h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-inner">
              <div className="absolute inset-x-8 top-2 h-1 rounded-full bg-slate-700/80" />
              <div className="absolute inset-x-10 bottom-2 h-1 rounded-full bg-slate-900" />
              <div className="absolute left-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-slate-700" />
              <div className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-slate-700" />
              <div className="flex h-full items-center justify-center rounded-md border border-slate-800 bg-black font-mono text-4xl font-bold text-cyan-300 shadow-[inset_0_0_24px_rgba(34,211,238,0.18)]">
                {formatarHoraPtBr(marcacao.dataHora, marcacao.fusoHorario)}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">
                  {obterRotuloTipoMarcacao(marcacao.tipo)}
                </p>
                <OrigemMarcacaoIcon origem={marcacao.fonte} compacta />
              </div>

              {marcacao.observacao && (
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {marcacao.observacao}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                  marcacao.status === "VALIDA"
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {marcacao.status}
              </span>
            </div>
          </div>
        ))}

        {marcacoes.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-[var(--muted-foreground)] md:col-span-2 xl:col-span-4">
            Nenhuma marcação registrada hoje.
          </div>
        )}
      </div>
    </section>
  );
}
