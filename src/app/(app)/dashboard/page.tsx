import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverDashboardPerfil } from "@/modules/dashboard/application/resolver-dashboard-perfil";
import { DashboardAdmin } from "@/modules/dashboard/presentation/dashboard-admin/dashboard-admin";
import { DashboardAuditor } from "@/modules/dashboard/presentation/dashboard-auditor/dashboard-auditor";
import { DashboardDiref } from "@/modules/dashboard/presentation/dashboard-diref/dashboard-diref";
import { DashboardGestor } from "@/modules/dashboard/presentation/dashboard-gestor/dashboard-gestor";
import { DashboardMaster } from "@/modules/dashboard/presentation/dashboard-master/dashboard-master";
import { DashboardSecap } from "@/modules/dashboard/presentation/dashboard-secap/dashboard-secap";
import { DashboardServidor } from "@/modules/dashboard/presentation/dashboard-servidor/dashboard-servidor";
import { DashboardSuporte } from "@/modules/dashboard/presentation/dashboard-suporte/dashboard-suporte";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await exigirPermissaoOuRedirecionar("dashboard:visualizar:proprio");

  const dashboardPerfil = resolverDashboardPerfil(session.user.perfilAtivo);

  switch (dashboardPerfil) {
    case "MASTER":
      return <DashboardMaster />;
    case "ADMIN":
      return <DashboardAdmin usuarioId={session.user.id} />;
    case "GESTOR":
      return <DashboardGestor />;
    case "SECAP":
      return <DashboardSecap />;
    case "AUDITOR":
      return <DashboardAuditor />;
    case "DIREF":
      return <DashboardDiref />;
    case "SUPORTE":
      return <DashboardSuporte />;
    case "SERVIDOR":
    default:
      return (
        <DashboardServidor
          usuarioId={session.user.id}
          nomeFallback={session.user.nome || session.user.name || "Servidor"}
        />
      );
  }
}
