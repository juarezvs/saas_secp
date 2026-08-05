"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageTitlePersonalizadoProvider } from "@/components/layout/page-title-personalizado";
import { SecpTourServidor } from "@/components/layout/secp-tour";
import {
  Sidebar,
  type PerfilNavegacao,
  type RotinasSeccionalAtivas,
} from "@/components/layout/sidebar";
import type { PreferenciasAcessibilidade } from "@/modules/auth/application/services/preferencias-acessibilidade.service";
import type {
  IconesItensCatalogoMenu,
  MenusPersonalizadosPorPerfil,
} from "@/modules/menus/domain/menu-personalizado";

type UsuarioNavegacao = {
  nome: string;
  matricula: string;
  funcaoOuCargo?: string | null;
  fotoUrl?: string | null;
  unidade: string;
  instituicaoLabel: string;
  perfis: PerfilNavegacao[];
  perfilAtivo: PerfilNavegacao;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
  rotinasSeccional?: RotinasSeccionalAtivas;
};

type AppShellClientProps = {
  children: React.ReactNode;
  usuario: UsuarioNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  iconesItensCatalogo?: IconesItensCatalogoMenu;
  totalNotificacoes: number;
  onLogout: () => Promise<void>;
};

export function AppShellClient({
  children,
  usuario,
  menusPersonalizados,
  iconesItensCatalogo,
  totalNotificacoes,
  onLogout,
}: AppShellClientProps) {
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [perfilAtivo, setPerfilAtivo] = useState(usuario.perfilAtivo);
  const [tourServidorAberto, setTourServidorAberto] = useState(false);

  function alternarSidebar() {
    setSidebarRecolhida((valor) => !valor);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#conteudo-principal"
        className="sr-only z-[100] rounded-md bg-card px-4 py-2 font-semibold text-foreground shadow-floating focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Ir para o conteudo principal
      </a>
      <div className="flex min-h-screen">
        <Sidebar
          recolhida={sidebarRecolhida}
          drawerAberto={drawerAberto}
          perfilAtivo={perfilAtivo}
          menusPersonalizados={menusPersonalizados}
          iconesItensCatalogo={iconesItensCatalogo}
          preferenciasAcessibilidade={usuario.preferenciasAcessibilidade}
          rotinasSeccional={usuario.rotinasSeccional}
          instituicaoLabel={usuario.instituicaoLabel}
          onFecharDrawer={() => setDrawerAberto(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            nomeUsuario={usuario.nome}
            matricula={usuario.matricula}
            funcaoOuCargo={usuario.funcaoOuCargo}
            fotoUrl={usuario.fotoUrl}
            unidadeAtual={usuario.unidade}
            perfis={usuario.perfis}
            perfilAtivo={perfilAtivo}
            onPerfilAtivoChange={setPerfilAtivo}
            onLogout={onLogout}
            onToggleSidebar={alternarSidebar}
            onOpenMobileMenu={() => setDrawerAberto(true)}
            sidebarRecolhida={sidebarRecolhida}
            drawerAberto={drawerAberto}
            totalNotificacoes={totalNotificacoes}
            preferenciasAcessibilidade={usuario.preferenciasAcessibilidade}
            onStartTour={
              perfilAtivo.codigo.toUpperCase() === "SERVIDOR"
                ? () => setTourServidorAberto(true)
                : undefined
            }
          />

          <main
            id="conteudo-principal"
            tabIndex={-1}
            className="flex-1 scroll-mt-20 px-3 py-3 focus:outline-none sm:px-4 lg:px-5 lg:py-4 xl:px-6"
            data-tour="conteudo-principal"
          >
            <PageTitlePersonalizadoProvider
              perfilAtivoId={perfilAtivo.id}
              menusPersonalizados={menusPersonalizados}
            >
              <div className="w-full">{children}</div>
            </PageTitlePersonalizadoProvider>
          </main>
        </div>
      </div>
      {perfilAtivo.codigo.toUpperCase() === "SERVIDOR" && tourServidorAberto && (
        <SecpTourServidor
          onOpenChange={setTourServidorAberto}
        />
      )}
    </div>
  );
}
