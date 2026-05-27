import { CheckCircle2, Circle, Send, UserCheck } from "lucide-react";

type SolicitacaoStepperProps = {
  status: string;
};

const etapas = [
  {
    status: "ENVIADA",
    titulo: "Solicitação enviada",
    icon: Send,
  },
  {
    status: "EM_ANALISE",
    titulo: "Em análise",
    icon: UserCheck,
  },
  {
    status: "CONCLUIDA",
    titulo: "Concluída",
    icon: CheckCircle2,
  },
];

function indiceAtual(status: string) {
  if (["DEFERIDA", "INDEFERIDA", "CANCELADA"].includes(status)) {
    return 2;
  }

  if (status === "EM_ANALISE") {
    return 1;
  }

  return 0;
}

export function SolicitacaoStepper({ status }: SolicitacaoStepperProps) {
  const atual = indiceAtual(status);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Fluxo da solicitação</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {etapas.map((etapa, index) => {
          const Icon = index <= atual ? etapa.icon : Circle;
          const ativa = index <= atual;

          return (
            <div
              key={etapa.status}
              className={`rounded-xl border p-4 ${
                ativa
                  ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <p className="mt-3 font-semibold">{etapa.titulo}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}