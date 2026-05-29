import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PERFIL_ATIVO_COOKIE } from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

type UsuarioSessaoComPerfis = {
  nome: string;
  matricula: string;
  perfilAtivo?: PerfilSessao | null;
  perfis?: PerfilSessao[];
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

  const perfilAtivo =
    perfis.find((perfil) => perfil.codigo === perfilAtivoCodigo) ??
    usuarioSessao.perfilAtivo ??
    perfis[0] ??
    null;

  return (
    <AppShellClient
      usuario={{
        nome: usuarioSessao.nome,
        matricula: usuarioSessao.matricula,
        perfis,
        perfilAtivo,
      }}
    >
      {children}
    </AppShellClient>
  );
}
