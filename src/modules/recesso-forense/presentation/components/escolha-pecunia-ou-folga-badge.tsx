import { Badge } from "@/components/ui";
import type { EscolhaRecesso } from "../data/recesso-forense.mock";

type EscolhaPecuniaOuFolgaBadgeProps = {
  escolha: EscolhaRecesso;
};

export function EscolhaPecuniaOuFolgaBadge({ escolha }: EscolhaPecuniaOuFolgaBadgeProps) {
  return <Badge variant={escolha === "Pecúnia" ? "pendente" : "regular"}>{escolha}</Badge>;
}

