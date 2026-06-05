import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  PLANEJADO: "Planejado",
  ABERTO: "Aberto",
  EM_CONVOCACAO: "Em convocacao",
  EM_EXECUCAO: "Em execucao",
  FECHADO: "Fechado",
  CANCELADO: "Cancelado",
  RASCUNHO: "Rascunho",
  PUBLICADA: "Publicada",
  CONVOCADO: "Convocado",
  PENDENTE: "Pendente",
  HOMOLOGADO: "Homologado",
  DEVOLVIDO: "Devolvido",
  ACEITO_SECAD: "Aceito SECAD",
  RECESSO_FORENSE: "Recesso forense",
  PECUNIA: "Pecunia",
  FOLGA: "Folga",
  MISTO: "Misto",
};

export function RecessoStatusBadge({ status }: { status: string }) {
  const variant =
    status === "HOMOLOGADO" || status === "ACEITO_SECAD"
      ? "homologado"
      : status === "RECESSO_FORENSE"
        ? "recesso"
        : status === "DEVOLVIDO" || status === "CANCELADO"
          ? "indeferido"
          : "pendente";

  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
