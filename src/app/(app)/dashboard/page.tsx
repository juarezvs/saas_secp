import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardAdmin } from "@/modules/dashboard/presentation/components/dashboard-admin";
import { DashboardServidor } from "@/modules/dashboard/presentation/components/dashboard-servidor";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const perfilCodigo =
    session.user.perfilAtivo?.codigo?.toUpperCase() ??
    session.user.perfilAtivo?.nome?.toUpperCase() ??
    "";

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const isAdmin =
    perfilCodigo === "ADMIN" ||
    perfilCodigo === "MASTER" ||
    permissoes.includes("usuarios:gerenciar:global") ||
    permissoes.includes("servidores:gerenciar:global");

  const isServidor =
    perfilCodigo === "SERVIDOR" ||
    permissoes.includes("marcacoes:registrar:proprio");

  if (isAdmin) {
    return <DashboardAdmin usuarioId={session.user.id} />;
  }

  if (isServidor) {
    return <DashboardServidor usuarioId={session.user.id} />;
  }

  return <DashboardServidor usuarioId={session.user.id} />;
}