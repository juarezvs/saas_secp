import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { Card } from "@/components/ui";

type FrequenciaMesResumoProps = {
  resumo: {
    mes: string;
    diasUteis: number;
    regular: number;
    pendente: number;
    falta: number;
    recesso: number;
    aguardando: number;
  };
};

function percentual(valor: number, total: number) {
  return total > 0 ? Math.round((valor / total) * 100) : 0;
}

function montarGradiente(resumo: FrequenciaMesResumoProps["resumo"]) {
  const total =
    resumo.regular +
    resumo.pendente +
    resumo.falta +
    resumo.recesso +
    resumo.aguardando;

  if (total === 0) {
    return "#d1d5db";
  }

  const segmentos = [
    ["var(--secp-green-700)", resumo.regular],
    ["var(--secp-warning)", resumo.pendente],
    ["var(--secp-danger)", resumo.falta],
    ["#d1d5db", resumo.recesso],
    ["var(--secp-info)", resumo.aguardando],
  ] as const;
  let cursor = 0;

  return `conic-gradient(${segmentos
    .filter(([, valor]) => valor > 0)
    .map(([cor, valor]) => {
      const inicio = cursor;
      cursor += (valor / total) * 100;
      return `${cor} ${inicio}% ${cursor}%`;
    })
    .join(", ")})`;
}

export function FrequenciaMesResumo({ resumo }: FrequenciaMesResumoProps) {
  const total =
    resumo.regular +
    resumo.pendente +
    resumo.falta +
    resumo.recesso +
    resumo.aguardando;
  const regularPercent = percentual(resumo.regular + resumo.aguardando, total);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Frequência do mês</h2>
        <Link
          href="/espelho-ponto"
          className="rounded-sm text-xs font-semibold text-secp-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Ver espelho
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[5.25rem_1fr] sm:items-center">
        <div
          className="grid aspect-square place-items-center rounded-full p-3"
          style={{ background: montarGradiente(resumo) }}
        >
          <div className="grid size-full place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-[10px] leading-none text-muted-foreground">
                {resumo.mes}
              </p>
              <p className="mt-1 text-xl font-bold leading-none">
                {resumo.diasUteis}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                dias úteis
              </p>
            </div>
          </div>
        </div>

        <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <Linha label="Regulares" valor={resumo.regular} cor="bg-secp-green-700" />
          <Linha label="Pendentes" valor={resumo.pendente} cor="bg-secp-warning" />
          <Linha label="Faltas" valor={resumo.falta} cor="bg-secp-danger" />
          <Linha label="Sem expediente" valor={resumo.recesso} cor="bg-slate-300" />
          <Linha label="Aguard. homologação" valor={resumo.aguardando} cor="bg-secp-info" />
        </dl>
      </div>

      <div className="mt-3 flex gap-2 rounded-md bg-muted p-2 text-xs leading-5">
        <FileCheck2
          className="mt-0.5 size-4 shrink-0 text-secp-blue-700"
          aria-hidden="true"
        />
        <p>
          <strong>Status:</strong> {regularPercent}% dos dias apurados estão
          regulares ou aguardando homologação.
        </p>
      </div>
    </Card>
  );
}

function Linha({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <span className={`size-2 rounded-full ${cor}`} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="font-bold">{valor}</dd>
    </div>
  );
}
