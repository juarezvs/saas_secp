import { DashboardAdmin as DashboardAdminAtual } from "@/modules/dashboard/presentation/components/dashboard-admin";

type DashboardAdminProps = {
  usuarioId: string;
  orgaoIds?: string[];
  escopoGlobal?: boolean;
};

export async function DashboardAdmin({
  usuarioId,
  orgaoIds,
  escopoGlobal,
}: DashboardAdminProps) {
  return (
    <DashboardAdminAtual
      usuarioId={usuarioId}
      orgaoIds={orgaoIds}
      escopoGlobal={escopoGlobal}
    />
  );
}
