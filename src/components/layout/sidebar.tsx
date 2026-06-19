"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Cable,
  ClipboardList,
  Clock,
  Cpu,
  DatabaseZap,
  FileCheck2,
  FileSpreadsheet,
  Fingerprint,
  Hourglass,
  Landmark,
  LayoutDashboard,
  Network,
  ScanFace,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao-utils";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";

export type PerfilNavegacao = {
  codigo: string;
  nome: string;
  descricao?: string;
  permissoes?: string[];
};

export type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissoes?: string[];
};

export const MENU_ITEMS: MenuItem[] = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Registrar ponto", href: "/marcacoes/registrar", icon: Fingerprint, permissoes: PERMISSOES_ACESSO_REGISTRO_PONTO_SECP },
  { label: "Marcações", href: "/marcacoes", icon: Clock, permissoes: ["marcacoes:consultar:global"] },
  { label: "Marcações brutas", href: "/marcacoes-brutas", icon: DatabaseZap, permissoes: ["marcacoes:gerenciar:global", "afd:importar:global"] },
  { label: "Espelho de ponto", href: "/espelho-ponto", icon: CalendarDays, permissoes: ["espelho-ponto:visualizar:proprio", "apuracao:consultar:proprio", "apuracao:consultar:global"] },
  { label: "Banco de horas", href: "/banco-horas", icon: Hourglass, permissoes: ["banco-horas:visualizar:proprio", "banco-horas:consultar:proprio", "banco-horas:consultar:global"] },
  { label: "Solicitações", href: "/solicitacoes", icon: ClipboardList, permissoes: ["solicitacoes:criar:proprio", "solicitacoes:consultar:proprio", "solicitacoes:analisar:chefia", "solicitacoes:consultar:global"] },
  { label: "Homologação", href: "/homologacao", icon: ShieldCheck, permissoes: ["homologacao:gerenciar:chefia", "homologacao:consultar:global", "homologacao:gerenciar:global"] },
  { label: "Boletim de frequência", href: "/boletim-frequencia", icon: FileSpreadsheet, permissoes: ["boletim-frequencia:gerar:chefia", "boletim-frequencia:encaminhar:chefia", "boletim-frequencia:receber:global", "boletim-frequencia:consultar:global"] },
  { label: "Recesso forense", href: "/recesso-forense", icon: CalendarRange, permissoes: ["recesso:consultar:proprio", "recesso:consultar:global", "recesso:gerenciar:global", "recesso:homologar:chefia", "recesso:aceitar:secad"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, permissoes: ["relatorios:consultar:proprio", "relatorios:consultar:global"] },
  { label: "Biometria", href: "/biometria", icon: ScanFace, permissoes: ["biometria:consultar:proprio", "biometria:cadastrar:proprio", "biometria:gerenciar:global"] },
  { label: "Equipamentos", href: "/equipamentos", icon: Cpu, permissoes: ["integracoes:consultar:global", "integracoes:gerenciar:global", "afd:importar:global"] },
  { label: "Apuração", href: "/apuracao", icon: FileCheck2, permissoes: ["apuracao:consultar:global", "apuracao:recalcular:global"] },
  { label: "AFD", href: "/afd", icon: Upload, permissoes: ["afd:importar:global"] },
  { label: "Servidores", href: "/servidores", icon: Users, permissoes: ["servidores:gerenciar:global", "servidores:consultar:global"] },
  { label: "Usuários", href: "/usuarios", icon: UserCog, permissoes: ["usuarios:gerenciar:global", "usuarios:consultar:global"] },
  { label: "Perfis", href: "/perfis", icon: ShieldAlert, permissoes: ["perfis:gerenciar:global"] },
  { label: "Unidades", href: "/unidades", icon: Building2, permissoes: ["unidades:gerenciar:global"] },
  { label: "Órgãos", href: "/orgaos", icon: Landmark, permissoes: ["unidades:gerenciar:global"] },
  { label: "Jornadas", href: "/jornadas", icon: CalendarClock, permissoes: ["jornadas:gerenciar:global"] },
  { label: "Chefias", href: "/chefias", icon: Network, permissoes: ["chefias:gerenciar:global"] },
  { label: "Integrações", href: "/integracoes", icon: Cable, permissoes: ["integracoes:consultar:global", "integracoes:gerenciar:global"] },
  { label: "Administração", href: "/administracao", icon: Settings, permissoes: ["configuracoes:gerenciar:global"] },
  { label: "Auditoria", href: "/auditoria", icon: ScrollText, permissoes: ["auditoria:consultar:global", "auditoria:detalhar:global"] },
];

type SidebarProps = {
  recolhida: boolean;
  drawerAberto: boolean;
  perfilAtivo: PerfilNavegacao;
  onFecharDrawer: () => void;
};

export function podeExibirItem() {
  return true;
}

export function perfilPodeAcessarPath() {
  return true;
}

function itemPodeSerExibido(item: MenuItem, perfilAtivo: PerfilNavegacao) {
  if (!item.permissoes || item.permissoes.length === 0) {
    return true;
  }

  return usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivo.codigo,
    perfilAtivo.permissoes,
    item.permissoes,
  );
}

function MenuPrincipal({
  recolhida,
  perfilAtivo,
  onNavigate,
}: {
  recolhida: boolean;
  perfilAtivo: PerfilNavegacao;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const itensVisiveis = MENU_ITEMS.filter((item) =>
    itemPodeSerExibido(item, perfilAtivo),
  );

  return (
    <nav
      className="flex-1 overflow-y-auto px-3 py-4"
      aria-label={`Menu do perfil ${perfilAtivo.nome}`}
    >
      <ul className="space-y-1">
        {itensVisiveis.map((item) => {
          const Icon = item.icon;
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={ativo ? "page" : undefined}
                aria-label={recolhida ? item.label : undefined}
                title={recolhida ? item.label : undefined}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  ativo
                    ? "bg-secp-blue-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
                  recolhida ? "justify-center" : "",
                ].join(" ")}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {!recolhida && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
        {itensVisiveis.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            Nenhum item disponível para o perfil ativo.
          </li>
        )}
      </ul>
    </nav>
  );
}

export function Sidebar({
  recolhida,
  drawerAberto,
  perfilAtivo,
  onFecharDrawer,
}: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerAberto) {
      return;
    }

    closeButtonRef.current?.focus();

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onFecharDrawer();
      }
    }

    window.addEventListener("keydown", fecharComEscape);

    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [drawerAberto, onFecharDrawer]);

  return (
    <>
      <aside
        id="secp-sidebar-desktop"
        className={[
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card text-card-foreground shadow-card transition-[width] duration-300 lg:flex",
          recolhida ? "w-20" : "w-72",
        ].join(" ")}
        aria-label="Menu principal"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secp-blue-900 text-sm font-black text-white">
              SE
            </div>
            {!recolhida && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">SECP</p>
                <p className="truncate text-xs text-muted-foreground">
                  Perfil {perfilAtivo.nome}
                </p>
              </div>
            )}
          </div>
          <MenuPrincipal recolhida={recolhida} perfilAtivo={perfilAtivo} />
        </div>
      </aside>

      {drawerAberto && (
        <div
          id="secp-sidebar-mobile"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            aria-label="Fechar menu principal"
            tabIndex={-1}
            onClick={onFecharDrawer}
          />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-card text-card-foreground shadow-floating">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-secp-blue-900 text-sm font-black text-white">
                  SE
                </div>
                <div>
                  <p className="text-sm font-bold">SECP</p>
                  <p className="text-xs text-muted-foreground">
                    Perfil {perfilAtivo.nome}
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onFecharDrawer}
                className="inline-flex size-10 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Fechar menu principal"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <MenuPrincipal
              recolhida={false}
              perfilAtivo={perfilAtivo}
              onNavigate={onFecharDrawer}
            />
          </aside>
        </div>
      )}
    </>
  );
}
