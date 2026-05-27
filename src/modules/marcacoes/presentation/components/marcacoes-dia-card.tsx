import { Clock3 } from "lucide-react";
import { formatarHoraPtBr } from "../../application/services/data-marcacao.service";
import { obterRotuloTipoMarcacao } from "../../application/services/classificar-marcacao.service";

type MarcacaoDiaItem = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte: string;
  status: string;
  observacao: string | null;
};

export function MarcacoesDiaCard({
  marcacoes,
}: {
  marcacoes: MarcacaoDiaItem[];
}) {
  return (
    <section className="rounded-xl border bg-(--card) text-(--card-foreground) shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Marcações do dia</h2>
      </div>

      <div className="divide-y">
        {marcacoes.map((marcacao) => (
          <div
            key={marcacao.id}
            className="flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center"
          >
            <div>
              <p className="font-semibold">
                {obterRotuloTipoMarcacao(marcacao.tipo)}
              </p>

              <p className="mt-1 text-sm text-(--muted-foreground)">
                {formatarHoraPtBr(marcacao.dataHora)} • Fonte:{" "}
                {marcacao.fonte}
              </p>

              {marcacao.observacao && (
                <p className="mt-1 text-sm text-(--muted-foreground)">
                  {marcacao.observacao}
                </p>
              )}
            </div>

            <span
              className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                marcacao.status === "VALIDA"
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {marcacao.status}
            </span>
          </div>
        ))}

        {marcacoes.length === 0 && (
          <div className="p-8 text-center text-sm text-(--muted-foreground)">
            Nenhuma marcação registrada hoje.
          </div>
        )}
      </div>
    </section>
  );
}