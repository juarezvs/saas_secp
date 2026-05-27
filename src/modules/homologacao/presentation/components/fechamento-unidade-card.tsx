import { CalendarCheck } from "lucide-react";
import { rotuloStatusFechamento } from "../../application/services/formatar-homologacao.service";

type FechamentoUnidadeCardProps = {
  fechamento: {
    unidade: {
      sigla: string;
      nome: string;
    };
    anoReferencia: number;
    mesReferencia: number;
    status: string;
    abertoEm: Date;
    homologadoEm: Date | null;
    gestorResponsavel: {
      servidor: {
        usuario: {
          nome: string;
        };
      };
    } | null;
    servidores: {
      status: string;
    }[];
  };
};

export function FechamentoUnidadeCard({
  fechamento,
}: FechamentoUnidadeCardProps) {
  const total = fechamento.servidores.length;
  const homologados = fechamento.servidores.filter((item) =>
    ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(item.status),
  ).length;

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <CalendarCheck className="mt-1 size-6 text-blue-900 dark:text-blue-300" />

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Fechamento mensal
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {fechamento.unidade.sigla} —{" "}
            {String(fechamento.mesReferencia).padStart(2, "0")}/
            {fechamento.anoReferencia}
          </h2>

          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {fechamento.unidade.nome}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info
              label="Status"
              value={rotuloStatusFechamento(fechamento.status)}
            />
            <Info label="Servidores" value={`${homologados}/${total}`} />
            <Info
              label="Chefia"
              value={
                fechamento.gestorResponsavel?.servidor.usuario.nome ??
                "Não identificada"
              }
            />
            <Info
              label="Aberto em"
              value={new Intl.DateTimeFormat("pt-BR").format(
                fechamento.abertoEm,
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-(--muted) p-4">
      <p className="text-xs font-semibold uppercase text-(--muted-foreground)">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
