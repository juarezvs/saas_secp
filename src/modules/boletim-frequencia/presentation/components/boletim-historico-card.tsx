type BoletimHistoricoEvento = {
  id: string;
  acao: string;
  criadoEm: Date;
  usuario: {
    nome: string;
  } | null;
};

type BoletimHistoricoCardProps = {
  boletim: {
    geradoEm: Date;
    encaminhadoEm: Date | null;
    recebidoEm: Date | null;
    geradoPor: {
      nome: string;
    };
    encaminhadoPor: {
      nome: string;
    } | null;
    recebidoPor: {
      nome: string;
    } | null;
  };
  eventos: BoletimHistoricoEvento[];
};

function formatarDataHora(valor: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function rotuloAcao(acao: string) {
  const mapa: Record<string, string> = {
    BOLETIM_FREQUENCIA_GERADO: "Boletim gerado",
    BOLETIM_FREQUENCIA_ENCAMINHADO_SECAP: "Encaminhado a SECAP/NUCGP",
    BOLETIM_FREQUENCIA_RECEBIDO_SECAP: "Recebido pela SECAP/NUCGP",
    BOLETIM_FREQUENCIA_CONFERIDO: "Conferido pela SECAP/NUCGP",
  };

  return mapa[acao] ?? acao;
}

export function BoletimHistoricoCard({
  boletim,
  eventos,
}: BoletimHistoricoCardProps) {
  const marcos = [
    {
      id: "gerado",
      titulo: "Geracao do boletim",
      data: boletim.geradoEm,
      autor: boletim.geradoPor.nome,
      descricao:
        "Consolidacao criada a partir do fechamento mensal homologado pela chefia.",
    },
    boletim.encaminhadoEm
      ? {
          id: "encaminhado",
          titulo: "Encaminhamento para SECAP/NUCGP",
          data: boletim.encaminhadoEm,
          autor: boletim.encaminhadoPor?.nome ?? "SECP",
          descricao:
            "Boletim encaminhado para conferencia e providencias administrativas.",
        }
      : null,
    boletim.recebidoEm
      ? {
          id: "recebido",
          titulo: "Registro da SECAP/NUCGP",
          data: boletim.recebidoEm,
          autor: boletim.recebidoPor?.nome ?? "SECAP/NUCGP",
          descricao: "Recebimento ou conferencia registrado no sistema.",
        }
      : null,
  ].filter((marco): marco is NonNullable<typeof marco> => Boolean(marco));

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Historico do boletim</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
        Registro cronologico das etapas do boletim e dos eventos auditaveis do
        ciclo Chefia → SECAP.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase text-[var(--muted-foreground)]">
            Marcos do fluxo
          </h3>
          <ol className="mt-3 space-y-3">
            {marcos.map((marco) => (
              <li key={marco.id} className="rounded-lg border p-4">
                <p className="font-semibold">{marco.titulo}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {marco.descricao}
                </p>
                <p className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">
                  {formatarDataHora(marco.data)} · {marco.autor}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase text-[var(--muted-foreground)]">
            Auditoria
          </h3>
          <ol className="mt-3 space-y-3">
            {eventos.map((evento) => (
              <li key={evento.id} className="rounded-lg border p-4">
                <p className="font-semibold">{rotuloAcao(evento.acao)}</p>
                <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                  {formatarDataHora(evento.criadoEm)} ·{" "}
                  {evento.usuario?.nome ?? "Sistema"}
                </p>
              </li>
            ))}

            {eventos.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-sm text-[var(--muted-foreground)]">
                Nenhum evento de auditoria localizado para este boletim.
              </li>
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}
