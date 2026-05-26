"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type AppShellClientProps = {
  children: React.ReactNode;
  usuario: {
    nome: string;
    matricula: string;
    perfilAtivo: PerfilSessao | null;
  };
};

export function AppShellClient({ children, usuario }: AppShellClientProps) {
  const [sidebarAberta, setSidebarAberta] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <Sidebar aberta={sidebarAberta} perfilAtivo={usuario.perfilAtivo} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            nomeUsuario={usuario.nome}
            matricula={usuario.matricula}
            perfilAtivo={usuario.perfilAtivo}
            onToggleSidebar={() => setSidebarAberta((valor) => !valor)}
          />

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
