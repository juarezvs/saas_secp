import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShellClient
      usuario={{
        nome: session.user.nome,
        matricula: session.user.matricula,
        perfilAtivo: session.user.perfilAtivo,
      }}
    >
      {children}
    </AppShellClient>
  );
}
