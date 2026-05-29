import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import {
  resolverPerfilAtivoDaSessao,
  type UsuarioSessaoComPerfis,
} from "@/modules/auth/application/services/resolver-perfil-ativo";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const usuarioSessao = session.user as UsuarioSessaoComPerfis;
  const perfis = usuarioSessao.perfis ?? [];
  const cookieStore = await cookies();
  const perfilAtivoCodigo = cookieStore.get(PERFIL_ATIVO_COOKIE)?.value;
  const perfilAtivo = resolverPerfilAtivoDaSessao(
    usuarioSessao,
    perfilAtivoCodigo,
  );

  return (
    <AppShellClient
      usuario={{
        nome: usuarioSessao.nome ?? usuarioSessao.name ?? "Usuário",
        matricula: usuarioSessao.matricula ?? "",
        perfis,
        perfilAtivo,
      }}
    >
      {children}
    </AppShellClient>
  );
}
