import { CheckCircle2, Clock3 } from "lucide-react";

type EventoSolicitacao = {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: Date;
  usuario: {
    nome: string;
  } | null;
};

export function SolicitacaoTimeline({
  eventos,
}: {
  eventos: EventoSolicitacao[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Linha do tempo</h2>
      </div>

      <div className="p-5">
        {eventos.length > 0 ? (
          <ol className="grid gap-3 lg:grid-cols-4">
            {eventos.map((evento, indice) => (
              <li
                key={evento.id}
                className="rounded-lg border bg-[var(--muted)] p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                    {indice + 1}
                  </span>
                  <CheckCircle2
                    className="size-5 text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-3 text-sm font-semibold">{evento.tipo}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  {evento.descricao}
                </p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(evento.criadoEm)}
                  {evento.usuario ? ` - ${evento.usuario.nome}` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum evento registrado.
          </div>
        )}
      </div>
    </section>
  );
}
