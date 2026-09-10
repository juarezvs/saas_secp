import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

type DashboardPerfilShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function DashboardPerfilShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: DashboardPerfilShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Icon}
        titulo={title}
        descricao={`${eyebrow}. ${description}`}
      />

      {children}
    </div>
  );
}
