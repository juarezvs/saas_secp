import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui";

type PendenciasServidorPanelProps = {
  pendencias: string[];
};

export function PendenciasServidorPanel({ pendencias }: PendenciasServidorPanelProps) {
  if (pendencias.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
        <div className="flex gap-2">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          <p className="text-sm font-semibold">Nenhuma pendência impeditiva.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="flex gap-2">
        <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Pendências do servidor</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {pendencias.map((pendencia) => <li key={pendencia}>{pendencia}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}

