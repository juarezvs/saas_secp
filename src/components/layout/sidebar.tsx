"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type SidebarProps = {
  aberta: boolean;
  perfilAtivo: PerfilSessao | null;
};

type MenuItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
  permissao?: string;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Gauge,
  },
  {
    label: "Unidades",
    href: "/unidades",
    icon: Building2,
    permissao: "unidades:gerenciar:global",
  },
  {
    label: "Servidores",
    href: "/servidores",
    icon: UsersRound,
    permissao: "servidores:gerenciar:global",
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: UsersRound,
    permissao: "usuarios:gerenciar:global",
  },
  {
    label: "Perfis",
    href: "/perfis",
    icon: ShieldCheck,
    permissao: "perfis:gerenciar:global",
  },
  {
    label: "Chefias",
    href: "/chefias",
    icon: UserCheck,
    permissao: "chefias:gerenciar:global",
  },
  {
    label: "Jornadas",
    href: "/jornadas",
    icon: CalendarClock,
    permissao: "jornadas:gerenciar:global",
  },
  {
    label: "Marcações",
    href: "/marcacoes",
    icon: Clock3,
    permissao: "marcacoes:consultar:proprio",
  },
  {
    label: "Solicitações",
    href: "/solicitacoes",
    icon: ClipboardCheck,
    permissao: "solicitacoes:consultar:proprio",
  },
  {
    label: "Homologação",
    href: "/homologacao",
    icon: CalendarCheck,
    permissao: "homologacao:gerenciar:chefia",
  },
  {
    label: "Boletim de Frequência",
    href: "/boletim-frequencia",
    icon: FileCheck2,
    permissao: "boletim-frequencia:gerar:chefia",
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: FileText,
    permissao: "relatorios:consultar:proprio",
  },
  {
    label: "Auditoria",
    href: "/auditoria",
    icon: ShieldAlert,
    permissao: "auditoria:consultar:global",
  },
  {
    label: "Banco de Horas",
    href: "/banco-horas",
    icon: BarChart3,
    permissao: "banco-horas:consultar:proprio",
  },
  {
    label: "Apuração",
    href: "/apuracao",
    icon: Calculator,
    permissao: "apuracao:consultar:proprio",
  },
  {
    label: "Espelho de Ponto",
    href: "/espelho-ponto",
    icon: ClipboardList,
    permissao: "apuracao:consultar:proprio",
  },

  {
    label: "Biometria",
    href: "/biometria",
    icon: Fingerprint,
  },

  {
    label: "Administração",
    href: "/administracao",
    icon: Settings,
    permissao: "configuracoes:gerenciar:global",
  },
];

function podeExibirItem(item: MenuItem, perfilAtivo: PerfilSessao | null) {
  if (!item.permissao) {
    return true;
  }

  return perfilAtivo?.permissoes.includes(item.permissao) ?? false;
}

export function Sidebar({ aberta, perfilAtivo }: SidebarProps) {
  const pathname = usePathname();

  const itensVisiveis = menuItems.filter((item) =>
    podeExibirItem(item, perfilAtivo),
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${
        aberta ? "w-72" : "w-20"
      }`}
      aria-label="Menu principal"
    >
      <div className="flex w-full flex-col">
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white">
            SE
          </div>

          {aberta && (
            <div className="ml-3 min-w-0">
              <p className="truncate text-sm font-bold">SECP</p>
              <p className="truncate text-xs text-slate-400">
                Controle de Ponto
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {itensVisiveis.map((item) => {
              const Icon = item.icon;
              const ativo =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      ativo
                        ? "bg-blue-700 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                    title={!aberta ? item.label : undefined}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    {aberta && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            title={!aberta ? "Sair" : undefined}
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            {aberta && <span>Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
