import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolverDashboardPerfil } from "@/modules/dashboard/application/resolver-dashboard-perfil";
import { DashboardAdmin } from "@/modules/dashboard/presentation/dashboard-admin/dashboard-admin";
import { DashboardAuditor } from "@/modules/dashboard/presentation/dashboard-auditor/dashboard-auditor";
import { DashboardDiref } from "@/modules/dashboard/presentation/dashboard-diref/dashboard-diref";
import { DashboardGestor } from "@/modules/dashboard/presentation/dashboard-gestor/dashboard-gestor";
import { DashboardGenerico } from "@/modules/dashboard/presentation/dashboard-generico/dashboard-generico";
import { DashboardMaster } from "@/modules/dashboard/presentation/dashboard-master/dashboard-master";
import { DashboardSecap } from "@/modules/dashboard/presentation/dashboard-secap/dashboard-secap";
import { DashboardServidor } from "@/modules/dashboard/presentation/dashboard-servidor/dashboard-servidor";
import { DashboardSuporte } from "@/modules/dashboard/presentation/dashboard-suporte/dashboard-suporte";
import { listarFavoritosUsuarioPerfil } from "@/modules/favoritos/application/favoritos-usuario-perfil.service";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = searchParams ? await searchParams : {};
  const secao = Array.isArray(params.secao) ? params.secao[0] : params.secao;
  const favoritosPerfil = await listarFavoritosUsuarioPerfil({
    usuarioId: session.user.id,
    perfil: {
      id: session.user.perfilAtivo?.id,
      permissoes: session.user.perfilAtivo?.permissoes ?? [],
    },
  });

  if (secao === "favoritos") {
    return (
      <DashboardGenerico
        nome={session.user.nome || session.user.name || "Usuario"}
        perfilNome={session.user.perfilAtivo?.nome}
        permissoes={session.user.perfilAtivo?.permissoes ?? []}
        favoritos={favoritosPerfil}
        somenteFavoritos
      />
    );
  }

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
    case "GENERICO":
      return (
        <DashboardGenerico
          nome={session.user.nome || session.user.name || "Usuário"}
          perfilNome={session.user.perfilAtivo?.nome}
          permissoes={session.user.perfilAtivo?.permissoes ?? []}
          favoritos={favoritosPerfil}
        />
      );
    case "SERVIDOR":
    default:
      return (
        <DashboardServidor
          usuarioId={session.user.id}
          nomeFallback={session.user.nome || session.user.name || "Servidor"}
          perfilAtivoCodigo={session.user.perfilAtivo?.codigo}
          permissoesPerfil={session.user.perfilAtivo?.permissoes ?? []}
        />
      );
  }
}
