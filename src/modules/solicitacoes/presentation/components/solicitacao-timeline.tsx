import { Clock3 } from "lucide-react";

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

      <div className="divide-y">
        {eventos.map((evento) => (
          <div key={evento.id} className="p-5">
            <p className="font-semibold">{evento.tipo}</p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {evento.descricao}
            </p>

            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(evento.criadoEm)}
              {evento.usuario ? ` • ${evento.usuario.nome}` : ""}
            </p>
          </div>
        ))}

        {eventos.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum evento registrado.
          </div>
        )}
      </div>
    </section>
  );
}