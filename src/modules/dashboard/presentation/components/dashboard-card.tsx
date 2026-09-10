import type { LucideIcon } from "lucide-react";

import { DashboardRoleCard } from "./dashboard-role-card";
import type { DashboardRoleCardColor } from "./dashboard-role-card";

export function DashboardCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  cor,
}: {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: LucideIcon;
  cor?: DashboardRoleCardColor;
}) {
  return (
    <DashboardRoleCard
      titulo={titulo}
      valor={valor}
      descricao={descricao}
      icon={Icon}
      cor={cor}
    />
  );
}
