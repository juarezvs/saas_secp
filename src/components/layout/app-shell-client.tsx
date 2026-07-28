"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { PageTitlePersonalizadoProvider } from "@/components/layout/page-title-personalizado";
import { Sidebar, type PerfilNavegacao } from "@/components/layout/sidebar";
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
};

type AppShellClientProps = {
  children: React.ReactNode;
  usuario: UsuarioNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  iconesItensCatalogo?: IconesItensCatalogoMenu;
  totalNotificacoes: number;
  onLogout: () => Promise<void>;
};

const AUTO_COLLAPSE_SIDEBAR_LOGIN_KEY = "secp.sidebar.autoCollapseAfterLogin";
const AUTO_COLLAPSE_SIDEBAR_DELAY_MS = 3000;

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
  const usuarioInteragiuSidebarRef = useRef(false);

  useEffect(() => {
    let deveRecolher = false;

    try {
      const marcador = window.sessionStorage.getItem(
        AUTO_COLLAPSE_SIDEBAR_LOGIN_KEY,
      );
      const matriculaUsuario = usuario.matricula.trim().toUpperCase();

      deveRecolher = marcador === "1" || marcador === matriculaUsuario;

      if (deveRecolher) {
        window.sessionStorage.removeItem(AUTO_COLLAPSE_SIDEBAR_LOGIN_KEY);
      }
    } catch {
      deveRecolher = false;
    }

    if (!deveRecolher) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!usuarioInteragiuSidebarRef.current) {
        setSidebarRecolhida(true);
      }
    }, AUTO_COLLAPSE_SIDEBAR_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [usuario.matricula]);

  function alternarSidebar() {
    usuarioInteragiuSidebarRef.current = true;
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
          />

          <main
            id="conteudo-principal"
            tabIndex={-1}
            className="flex-1 scroll-mt-20 px-3 py-5 focus:outline-none sm:px-4 lg:px-5 xl:px-6"
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
    </div>
  );
}
