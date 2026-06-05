import { Badge } from "@/components/ui";
import type { StatusFrequencia } from "../data/espelho-banco-horas.mock";

type StatusFrequenciaBadgeProps = {
  status: StatusFrequencia;
};

const config = {
  regular: { label: "Regular", variant: "regular" },
  pendente: { label: "Pendente", variant: "pendente" },
  falta: { label: "Falta", variant: "critico" },
  homologado: { label: "Homologado", variant: "homologado" },
  recesso: { label: "Recesso forense", variant: "recesso" },
} as const;

export function StatusFrequenciaBadge({ status }: StatusFrequenciaBadgeProps) {
  const item = config[status];

  return <Badge variant={item.variant}>{item.label}</Badge>;
}

