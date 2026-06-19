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

export function DashboardMetricCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  variante,
}: DashboardMetricCardProps) {
  return (
    <Card className="p-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase leading-tight text-muted-foreground">
            {titulo}
          </p>
          <p className="mt-1.5 text-lg font-bold leading-none text-foreground">
            {valor}
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
