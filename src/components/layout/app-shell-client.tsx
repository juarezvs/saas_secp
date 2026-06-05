"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar, type PerfilNavegacao } from "@/components/layout/sidebar";

type UsuarioNavegacao = {
  nome: string;
  matricula: string;
  unidade: string;
  perfis: PerfilNavegacao[];
  perfilAtivo: PerfilNavegacao;
};

type AppShellClientProps = {
  children: React.ReactNode;
  usuario: UsuarioNavegacao;
};

export function AppShellClient({ children, usuario }: AppShellClientProps) {
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [perfilAtivo, setPerfilAtivo] = useState(usuario.perfilAtivo);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar
          recolhida={sidebarRecolhida}
          drawerAberto={drawerAberto}
          perfilAtivo={perfilAtivo}
          onFecharDrawer={() => setDrawerAberto(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            nomeUsuario={usuario.nome}
            matricula={usuario.matricula}
            unidadeAtual={usuario.unidade}
            perfis={usuario.perfis}
            perfilAtivo={perfilAtivo}
            onPerfilAtivoChange={setPerfilAtivo}
            onToggleSidebar={() => setSidebarRecolhida((valor) => !valor)}
            onOpenMobileMenu={() => setDrawerAberto(true)}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

