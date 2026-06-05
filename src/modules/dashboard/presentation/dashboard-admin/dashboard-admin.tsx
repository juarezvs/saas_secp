import { DashboardAdmin as DashboardAdminAtual } from "@/modules/dashboard/presentation/components/dashboard-admin";

type DashboardAdminProps = {
  usuarioId: string;
};

export async function DashboardAdmin({ usuarioId }: DashboardAdminProps) {
  return <DashboardAdminAtual usuarioId={usuarioId} />;
}
