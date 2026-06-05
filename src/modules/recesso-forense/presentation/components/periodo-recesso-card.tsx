import { CalendarRange, UsersRound } from "lucide-react";

import { Card, Badge } from "@/components/ui";
import type { PeriodoRecesso } from "../data/recesso-forense.mock";
import { EscolhaPecuniaOuFolgaBadge } from "./escolha-pecunia-ou-folga-badge";

type PeriodoRecessoCardProps = {
  periodo: PeriodoRecesso;
};

const statusLabel = {
  "nao-convocado": "Não convocado",
  convocado: "Convocado",
  fechado: "Fechado pelo servidor",
  homologado: "Homologado pela chefia",
  aceito: "Aceito pela SECAD",
};

export function PeriodoRecessoCard({ periodo }: PeriodoRecessoCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-secp-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{periodo.titulo}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{periodo.intervalo}</p>
        </div>
        <Badge variant={periodo.status === "homologado" ? "homologado" : "pendente"}>
          {statusLabel[periodo.status]}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Resumo label="Convocados" value={String(periodo.convocados)} />
        <Resumo label="Não convocados" value={String(periodo.naoConvocados)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersRound className="size-4" aria-hidden="true" />
          Chefia: <strong className="text-foreground">{periodo.chefia}</strong>
        </p>
        <EscolhaPecuniaOuFolgaBadge escolha={periodo.escolha} />
      </div>
    </Card>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

