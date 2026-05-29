import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import {
  obterTipoDashboardPorPerfil,
  resolverPerfilAtivoDaSessao,
  type UsuarioSessaoComPerfis,
} from "@/modules/auth/application/services/resolver-perfil-ativo";
import { DashboardAdmin } from "@/modules/dashboard/presentation/components/dashboard-admin";
import { DashboardServidor } from "@/modules/dashboard/presentation/components/dashboard-servidor";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const usuarioSessao = session.user as UsuarioSessaoComPerfis;
  const cookieStore = await cookies();
  const perfilAtivoCodigo = cookieStore.get(PERFIL_ATIVO_COOKIE)?.value;
  const perfilAtivo = resolverPerfilAtivoDaSessao(
    usuarioSessao,
    perfilAtivoCodigo,
  );
  const tipoDashboard = obterTipoDashboardPorPerfil(perfilAtivo);
  const usuarioId = session.user.id;

  if (tipoDashboard === "ADMIN") {
    return <DashboardAdmin usuarioId={usuarioId} />;
  }

  if (tipoDashboard === "GESTOR") {
    // Enquanto não existir um DashboardGestor próprio, a chefia pode usar
    // temporariamente o dashboard administrativo ou um componente específico
    // de gestão quando for criado.
    return <DashboardAdmin usuarioId={usuarioId} />;
  }

  return <DashboardServidor usuarioId={usuarioId} />;
}
