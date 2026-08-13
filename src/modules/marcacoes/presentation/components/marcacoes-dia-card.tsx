import { Clock3 } from "lucide-react";

import { MarcacoesStepper } from "./marcacoes-stepper";

type MarcacaoDiaItem = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte: string;
  status: string;
  observacao: string | null;
  fusoHorario?: string | null;
  evidenciaFacialUrl?: string | null;
};

export function MarcacoesDiaCard({
  marcacoes,
  exigeIntervalo = true,
}: {
  marcacoes: MarcacaoDiaItem[];
  exigeIntervalo?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-[var(--muted)]/35 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Registro do dia</h2>
        </div>
        <span className="w-fit rounded-full border bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {marcacoes.length} registro{marcacoes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-4">
        <MarcacoesStepper
          marcacoes={marcacoes}
          exigeIntervalo={exigeIntervalo}
          vazioTexto="Nenhuma marcação registrada hoje."
        />
      </div>
    </section>
  );
}
