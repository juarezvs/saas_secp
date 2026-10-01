import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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

function DashboardComBreadcrumb({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3">
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      {children}
    </div>
  );
}

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
      <DashboardComBreadcrumb>
        <DashboardGenerico
          nome={session.user.nome || session.user.name || "Usuario"}
          perfilNome={session.user.perfilAtivo?.nome}
          permissoes={session.user.perfilAtivo?.permissoes ?? []}
          favoritos={favoritosPerfil}
          somenteFavoritos
        />
      </DashboardComBreadcrumb>
    );
  }

  const dashboardPerfil = resolverDashboardPerfil(session.user.perfilAtivo);

  switch (dashboardPerfil) {
    case "MASTER":
      return (
        <DashboardComBreadcrumb>
          <DashboardMaster />
        </DashboardComBreadcrumb>
      );
    case "ADMIN":
      return (
        <DashboardComBreadcrumb>
          <DashboardAdmin
            usuarioId={session.user.id}
            orgaoIds={session.user.perfilAtivo?.orgaos?.map((orgao) => orgao.id)}
            escopoGlobal={
              session.user.perfilAtivo?.permissoes?.some((permissao) =>
                permissao.endsWith(":global"),
              ) ?? false
            }
          />
        </DashboardComBreadcrumb>
      );
    case "GESTOR":
      return (
        <DashboardComBreadcrumb>
          <DashboardGestor />
        </DashboardComBreadcrumb>
      );
    case "SECAP":
      return (
        <DashboardComBreadcrumb>
          <DashboardSecap />
        </DashboardComBreadcrumb>
      );
    case "AUDITOR":
      return (
        <DashboardComBreadcrumb>
          <DashboardAuditor />
        </DashboardComBreadcrumb>
      );
    case "DIREF":
      return (
        <DashboardComBreadcrumb>
          <DashboardDiref />
        </DashboardComBreadcrumb>
      );
    case "SUPORTE":
      return (
        <DashboardComBreadcrumb>
          <DashboardSuporte />
        </DashboardComBreadcrumb>
      );
    case "GENERICO":
      return (
        <DashboardComBreadcrumb>
          <DashboardGenerico
            nome={session.user.nome || session.user.name || "Usuario"}
            perfilNome={session.user.perfilAtivo?.nome}
            permissoes={session.user.perfilAtivo?.permissoes ?? []}
            favoritos={favoritosPerfil}
          />
        </DashboardComBreadcrumb>
      );
    case "SERVIDOR":
    default:
      return (
        <DashboardComBreadcrumb>
          <DashboardServidor
            usuarioId={session.user.id}
            nomeFallback={session.user.nome || session.user.name || "Servidor"}
            perfilAtivoCodigo={session.user.perfilAtivo?.codigo}
            permissoesPerfil={session.user.perfilAtivo?.permissoes ?? []}
          />
        </DashboardComBreadcrumb>
      );
  }
}
