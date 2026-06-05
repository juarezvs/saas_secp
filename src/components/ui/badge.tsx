import type { HTMLAttributes } from "react";

import { cn } from "./utils";

type BadgeVariant =
  | "default"
  | "regular"
  | "pendente"
  | "critico"
  | "homologado"
  | "indeferido"
  | "aguardando"
  | "recesso"
  | "bloqueado";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  regular: "secp-status-regular",
  pendente: "secp-status-pendente",
  critico: "secp-status-critico",
  homologado: "secp-status-homologado",
  indeferido: "secp-status-indeferido",
  aguardando: "secp-status-aguardando",
  recesso: "secp-status-recesso",
  bloqueado: "secp-status-bloqueado",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold", variants[variant], className)}
      {...props}
    />
  );
}

