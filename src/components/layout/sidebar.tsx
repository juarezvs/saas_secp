"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  FileCheck2,
  HelpCircle,
  Home,
  Hourglass,
  X,
  type LucideIcon,
} from "lucide-react";

export type PerfilNavegacao = {
  codigo: string;
  nome: string;
  descricao?: string;
};

export type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const MENU_ITEMS: MenuItem[] = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Registrar ponto", href: "/marcacoes/registrar", icon: Clock },
  { label: "Minha frequencia", href: "/espelho-ponto", icon: CalendarDays },
  { label: "Meu banco de horas", href: "/banco-horas", icon: Hourglass },
  { label: "Solicitacoes", href: "/solicitacoes", icon: ClipboardList },
  { label: "Recesso forense", href: "/recesso-forense", icon: CalendarRange },
  { label: "Comprovantes", href: "/relatorios", icon: FileCheck2 },
  { label: "Relatorios", href: "/relatorios", icon: BarChart3 },
  { label: "Ajuda e regras", href: "/ajuda", icon: HelpCircle },
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

function MenuPrincipal({
  recolhida,
  onNavigate,
}: {
  recolhida: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu do perfil Servidor">
      <ul className="space-y-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={ativo ? "page" : undefined}
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
  return (
    <>
      <aside
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
          <MenuPrincipal recolhida={recolhida} />
        </div>
      </aside>

      {drawerAberto && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            aria-label="Fechar menu principal"
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
                type="button"
                onClick={onFecharDrawer}
                className="inline-flex size-10 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Fechar menu principal"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <MenuPrincipal recolhida={false} onNavigate={onFecharDrawer} />
          </aside>
        </div>
      )}
    </>
  );
}

