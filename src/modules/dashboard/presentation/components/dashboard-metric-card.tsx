import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui";

type DashboardMetricCardProps = {
  titulo: string;
  valor: string;
  descricao: string;
  icon: LucideIcon;
  variante: "info" | "success" | "warning";
};

const variantes = {
  info: "bg-blue-50 text-secp-blue-900 dark:bg-blue-950 dark:text-blue-200",
  success: "bg-green-50 text-secp-green-700 dark:bg-green-950 dark:text-green-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
};

export function DashboardMetricCard({ titulo, valor, descricao, icon: Icon, variante }: DashboardMetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{titulo}</p>
          <p className="mt-6 text-3xl font-bold text-foreground">{valor}</p>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
        <span className={`rounded-lg p-3 ${variantes[variante]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}

