import { CheckCircle2, Clock3, FileCheck2, Send, ShieldCheck } from "lucide-react";

import { rotuloStatusBoletim } from "../../application/services/formatar-boletim-frequencia.service";

type BoletimCicloCardProps = {
  boletim: {
    status: string;
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
    fechamento: {
      homologadoEm: Date | null;
      homologadoPor?: {
        nome: string;
      } | null;
    };
  };
};

function formatarDataHora(valor: Date | null) {
  if (!valor) {
    return "Pendente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

export function BoletimCicloCard({ boletim }: BoletimCicloCardProps) {
  const etapas = [
    {
      titulo: "Servidor",
      descricao: "Frequencia mensal apurada, espelho disponivel e dados prontos para analise.",
      data: "Base do fechamento",
      autor: "SECP",
      concluida: true,
      icon: FileCheck2,
    },
    {
      titulo: "Chefia",
      descricao: "Frequencia homologada e boletim mensal gerado pela unidade.",
      data: formatarDataHora(boletim.geradoEm),
      autor: boletim.geradoPor.nome,
      concluida: true,
      icon: ShieldCheck,
    },
    {
      titulo: "Encaminhamento",
      descricao: "Boletim enviado para conferencia da SECAP/NUCGP.",
      data: formatarDataHora(boletim.encaminhadoEm),
      autor: boletim.encaminhadoPor?.nome ?? "Pendente",
      concluida: Boolean(boletim.encaminhadoEm),
      icon: Send,
    },
    {
      titulo: "SECAP",
      descricao: "Recebimento, conferencia e registro administrativo do boletim.",
      data: formatarDataHora(boletim.recebidoEm),
      autor: boletim.recebidoPor?.nome ?? "Pendente",
      concluida: ["RECEBIDO_SECAP", "CONFERIDO"].includes(boletim.status),
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-lg font-bold">Ciclo do boletim</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Acompanhe o caminho institucional do boletim: apuracao do servidor,
            homologacao da chefia, encaminhamento e recebimento pela SECAP.
          </p>
        </div>

        <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {rotuloStatusBoletim(boletim.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {etapas.map((etapa) => {
          const Icon = etapa.icon;

          return (
            <article
              key={etapa.titulo}
              className={`rounded-lg border p-4 ${
                etapa.concluida
                  ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-white/70 p-2 text-current dark:bg-white/10">
                  {etapa.concluida ? (
                    <Icon className="size-5" aria-hidden="true" />
                  ) : (
                    <Clock3 className="size-5" aria-hidden="true" />
                  )}
                </span>

                <div>
                  <h3 className="font-bold">{etapa.titulo}</h3>
                  <p className="mt-1 text-sm leading-5 opacity-90">
                    {etapa.descricao}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-1 text-xs">
                <div>
                  <dt className="font-semibold uppercase opacity-70">Registro</dt>
                  <dd className="font-medium">{etapa.data}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase opacity-70">Responsavel</dt>
                  <dd className="font-medium">{etapa.autor}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
