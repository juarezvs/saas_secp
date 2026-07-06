import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui";
import { TempoTrabalhadoTempoReal } from "./tempo-trabalhado-tempo-real";

type DashboardMetricCardProps = {
  titulo: string;
  valor: string;
  descricao: string;
  icon: LucideIcon;
  variante: "info" | "success" | "warning";
  tempoReal?: {
    inicioIso: string;
    minutosBase: number;
  };
};

const variantes = {
  info: "bg-blue-50 text-secp-blue-900 dark:bg-blue-950 dark:text-blue-200",
  success: "bg-green-50 text-secp-green-700 dark:bg-green-950 dark:text-green-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
};

function incluirSegundosNoTempo(valor: string) {
  return /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
}

function TempoComSegundosMenores({ valor }: { valor: string }) {
  const [horasMinutos, segundos] = valor.split(/:(?=\d{2}$)/);

  return (
    <>
      {horasMinutos}
      {segundos ? (
        <span className="align-baseline text-[0.72em]">:{segundos}</span>
      ) : null}
    </>
  );
}

export function DashboardMetricCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  variante,
  tempoReal,
}: DashboardMetricCardProps) {
  const destacarHorasMinutos = titulo === "Trabalhado hoje";
  const valorFormatado =
    destacarHorasMinutos ? incluirSegundosNoTempo(valor) : valor;

  return (
    <Card className="p-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase leading-tight text-muted-foreground">
            {titulo}
          </p>
          <p className="mt-1.5 text-lg font-bold leading-none text-foreground">
            {tempoReal ? (
              <TempoTrabalhadoTempoReal
                inicioIso={tempoReal.inicioIso}
                minutosBase={tempoReal.minutosBase}
                valorInicial={valorFormatado}
              />
            ) : (
              destacarHorasMinutos ? (
                <TempoComSegundosMenores valor={valorFormatado} />
              ) : (
                valorFormatado
              )
            )}
          </p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {descricao}
          </p>
        </div>
        <span className={`rounded-md p-1.5 ${variantes[variante]}`}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
