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
  CalendarX,
  Cable,
  ChevronDown,
  ClipboardList,
  Clock,
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
  SlidersHorizontal,
  Upload,
  UserCog,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { SecpLogo } from "@/components/brand/secp-logo";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao-utils";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import {
  PERMISSAO_PAINEL_EXECUTIVO,
  PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
} from "@/modules/painel-executivo/presentation/painel-executivo-data";

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
  children?: MenuItem[];
};

export const MENU_ITEMS: MenuItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Registrar ponto",
    href: "/marcacoes/registrar",
    icon: Fingerprint,
    permissoes: PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  },
  {
    label: "Marcações",
    href: "/marcacoes",
    icon: Clock,
    permissoes: [
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:global",
    ],
  },
  {
    label: "Marcações brutas",
    href: "/marcacoes-brutas",
    icon: DatabaseZap,
    permissoes: ["marcacoes:gerenciar:global", "afd:importar:global"],
  },
  {
    label: "Espelho de ponto",
    href: "/espelho-ponto",
    icon: CalendarDays,
    permissoes: [
      "espelho-ponto:visualizar:proprio",
      "apuracao:consultar:global",
    ],
  },
  {
    label: "Meus afastamentos",
    href: "/meus-afastamentos",
    icon: CalendarX,
    permissoes: ["afastamentos:consultar:proprio"],
  },
  {
    label: "Banco de horas",
    href: "/banco-horas",
    icon: Hourglass,
    permissoes: [
      "banco-horas:visualizar:proprio",
      "banco-horas:consultar:proprio",
      "banco-horas:consultar:chefia",
      "banco-horas:consultar:global",
    ],
  },
  {
    label: "Solicitações",
    href: "/solicitacoes",
    icon: ClipboardList,
    permissoes: [
      "solicitacoes:criar:proprio",
      "solicitacoes:consultar:proprio",
      "solicitacoes:analisar:chefia",
      "solicitacoes:consultar:global",
    ],
  },
  {
    label: "Minha Equipe",
    href: "/minha-equipe",
    icon: UsersRound,
    permissoes: ["minha-equipe:consultar:chefia"],
  },
  {
    label: "Homologação",
    href: "/homologacao",
    icon: ShieldCheck,
    permissoes: [
      "homologacao:gerenciar:chefia",
      "homologacao:consultar:global",
      "homologacao:gerenciar:global",
    ],
  },
  {
    label: "Boletim de frequência",
    href: "/boletim-frequencia",
    icon: FileSpreadsheet,
    permissoes: [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ],
  },
  {
    label: "Recesso forense",
    href: "/recesso-forense",
    icon: CalendarRange,
    permissoes: [
      "recesso:consultar:proprio",
      "recesso:consultar:global",
      "recesso:gerenciar:global",
      "recesso:homologar:chefia",
      "recesso:aceitar:secad",
    ],
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    permissoes: [
      "relatorios:consultar:proprio",
      "relatorios:consultar:global",
      "relatorios-gerenciais:consultar:proprio",
      "relatorios-gerenciais:consultar:chefia",
      "relatorios-gerenciais:consultar:global",
    ],
  },
  {
    label: "Painel Executivo",
    href: "/painel-executivo",
    icon: BarChart3,
    permissoes: [
      PERMISSAO_PAINEL_EXECUTIVO,
      PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
    ],
    children: [
      {
        label: "Indicadores",
        href: "/painel-executivo/indicadores",
        icon: LayoutDashboard,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Pendências de ponto",
        href: "/painel-executivo/pendencias-de-ponto",
        icon: FileCheck2,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Frequência e assiduidade",
        href: "/painel-executivo/frequencia-e-assiduidade",
        icon: UsersRound,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Justificativas e ocorrências",
        href: "/painel-executivo/justificativas-e-ocorrencias",
        icon: ClipboardList,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Controle de homologação mensal",
        href: "/painel-executivo/controle-de-homologacao-mensal",
        icon: ShieldCheck,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Jornada e carga horária",
        href: "/painel-executivo/jornada-e-carga-horaria",
        icon: CalendarClock,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Teletrabalho, presencial e registro web",
        href: "/painel-executivo/teletrabalho-presencial-registro-web",
        icon: ScanFace,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Equipamentos de ponto",
        href: "/painel-executivo/equipamentos-de-ponto",
        icon: Cable,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS],
      },
      {
        label: "Auditoria e conformidade",
        href: "/painel-executivo/auditoria-e-conformidade",
        icon: ScrollText,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Indicadores por unidade e chefia",
        href: "/painel-executivo/indicadores-por-unidade-e-chefia",
        icon: Building2,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Alertas inteligentes",
        href: "/painel-executivo/alertas-inteligentes",
        icon: ShieldAlert,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Relatórios exportáveis",
        href: "/painel-executivo/relatorios-exportaveis",
        icon: FileSpreadsheet,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Paineis",
        href: "/painel-executivo/paineis",
        icon: LayoutDashboard,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Gráficos importantes",
        href: "/painel-executivo/graficos-importantes",
        icon: BarChart3,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
      {
        label: "Banco de horas",
        href: "/painel-executivo/banco-de-horas",
        icon: Hourglass,
        permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
      },
    ],
  },
  {
    label: "Biometria",
    href: "/biometria",
    icon: ScanFace,
    permissoes: [
      "biometria:consultar:proprio",
      "biometria:cadastrar:proprio",
      "biometria:gerenciar:global",
    ],
  },
  {
    label: "Apuração",
    href: "/apuracao",
    icon: FileCheck2,
    permissoes: ["apuracao:consultar:global", "apuracao:recalcular:global"],
  },
  {
    label: "AFD",
    href: "/afd",
    icon: Upload,
    permissoes: ["afd:importar:global"],
  },
  {
    label: "Servidores",
    href: "/servidores",
    icon: Users,
    permissoes: ["servidores:gerenciar:global", "servidores:consultar:global"],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: UserCog,
    permissoes: ["usuarios:gerenciar:global", "usuarios:consultar:global"],
  },
  {
    label: "Perfis",
    href: "/perfis",
    icon: ShieldAlert,
    permissoes: ["perfis:gerenciar:global"],
  },
  {
    label: "Unidades",
    href: "/unidades",
    icon: Building2,
    permissoes: ["unidades:gerenciar:global"],
  },
  {
    label: "Órgãos",
    href: "/orgaos",
    icon: Landmark,
    permissoes: ["unidades:gerenciar:global"],
  },
  {
    label: "Jornadas",
    href: "/jornadas",
    icon: CalendarClock,
    permissoes: ["jornadas:gerenciar:global"],
  },
  {
    label: "Chefias",
    href: "/chefias",
    icon: Network,
    permissoes: ["chefias:gerenciar:global"],
  },
  {
    label: "Integrações",
    href: "/integracoes",
    icon: Cable,
    permissoes: [
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
    ],
  },
  {
    label: "Administração",
    href: "/administracao",
    icon: Settings,
    permissoes: [
      "configuracoes:gerenciar:global",
      "usuarios:gerenciar:global",
      "usuarios:consultar:global",
      "perfis:gerenciar:global",
      "unidades:gerenciar:global",
      "jornadas:gerenciar:global",
      "chefias:gerenciar:global",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
      "regulamentacao-ponto:gerenciar:global",
      "fusos-horarios:gerenciar:global",
      "auditoria:consultar:global",
      "auditoria:detalhar:global",
    ],
  },
  {
    label: "Regulamentação",
    href: "/administracao/regulamentacao-ponto",
    icon: SlidersHorizontal,
    permissoes: ["regulamentacao-ponto:gerenciar:global"],
  },
  {
    label: "Fusos horários",
    href: "/administracao/fusos-horarios",
    icon: Clock,
    permissoes: ["fusos-horarios:gerenciar:global"],
  },
  {
    label: "Auditoria",
    href: "/auditoria",
    icon: ScrollText,
    permissoes: ["auditoria:consultar:global", "auditoria:detalhar:global"],
  },
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
  const algumFilhoVisivel = item.children?.some((child) =>
    itemPodeSerExibido(child, perfilAtivo),
  );

  if (algumFilhoVisivel) {
    return true;
  }

  if (!item.permissoes || item.permissoes.length === 0) {
    return true;
  }

  return usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilAtivo.codigo,
    perfilAtivo.permissoes,
    item.permissoes,
  );
}

function itemCorrespondeAoPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function filtrarItensVisiveis(
  itens: MenuItem[],
  perfilAtivo: PerfilNavegacao,
): MenuItem[] {
  return itens
    .map((item) => ({
      ...item,
      children: item.children
        ? filtrarItensVisiveis(item.children, perfilAtivo)
        : undefined,
    }))
    .filter((item) => itemPodeSerExibido(item, perfilAtivo));
}

function achatarItens(itens: MenuItem[]): MenuItem[] {
  return itens.flatMap((item) => [
    item,
    ...(item.children ? achatarItens(item.children) : []),
  ]);
}

function obterHrefAtivo(pathname: string, itens: MenuItem[]) {
  return achatarItens(itens)
    .filter((item) => itemCorrespondeAoPath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
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
  const itensVisiveis = filtrarItensVisiveis(MENU_ITEMS, perfilAtivo);
  const hrefAtivo = obterHrefAtivo(pathname, itensVisiveis);

  return (
    <nav
      className="flex-1 overflow-y-auto px-3 py-4"
      aria-label={`Menu do perfil ${perfilAtivo.nome}`}
    >
      <ul className="space-y-1">
        {itensVisiveis.map((item) => {
          const Icon = item.icon;
          const filhos = item.children ?? [];
          const possuiFilhos = filhos.length > 0;
          const ativo = item.href === hrefAtivo;
          const filhoAtivo = filhos.some((child) => child.href === hrefAtivo);
          const grupoAtivo = ativo || filhoAtivo;
          const mostrarFilhos = possuiFilhos && !recolhida && grupoAtivo;

          return (
            <li key={item.href} className="space-y-1">
              <Link
                href={possuiFilhos ? filhos[0]?.href ?? item.href : item.href}
                onClick={onNavigate}
                aria-current={grupoAtivo ? "page" : undefined}
                aria-label={recolhida ? item.label : undefined}
                title={recolhida ? item.label : undefined}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  grupoAtivo
                    ? "bg-secp-blue-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
                  recolhida ? "justify-center" : "",
                ].join(" ")}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {!recolhida && (
                  <>
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    {possuiFilhos && (
                      <ChevronDown
                        className={[
                          "size-4 shrink-0 transition-transform",
                          mostrarFilhos ? "rotate-180" : "",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </Link>

              {mostrarFilhos && (
                <ul className="ml-4 space-y-1 border-l border-border pl-2">
                  {filhos.map((child) => {
                    const ChildIcon = child.icon;
                    const childAtivo = child.href === hrefAtivo;

                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={childAtivo ? "page" : undefined}
                          className={[
                            "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            childAtivo
                              ? "bg-secp-blue-900/10 text-secp-blue-900 dark:bg-white/10 dark:text-white"
                              : "text-slate-600 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                          ].join(" ")}
                        >
                          <ChildIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {child.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
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
          <div
            className={[
              "flex h-[4.5rem] items-center border-b border-border/80 bg-gradient-to-b from-card to-muted/30 px-4",
              recolhida ? "justify-center" : "gap-3",
            ].join(" ")}
          >
            <SecpLogo
              variant="mark"
              className="size-11 shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-secp-blue-900/10"
            />
            {!recolhida && (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase text-secp-blue-800 dark:text-blue-200">
                  Justiça Federal
                </p>
                <p className="truncate text-xl font-black leading-6 tracking-normal text-foreground">
                  SECP
                </p>
                <span className="mt-1 inline-flex max-w-full rounded bg-secp-blue-900/10 px-2 py-0.5 text-[11px] font-semibold text-secp-blue-900 dark:bg-white/10 dark:text-blue-200">
                  <span className="truncate">{perfilAtivo.nome}</span>
                </span>
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
            <div className="flex h-[4.5rem] items-center justify-between border-b border-border/80 bg-gradient-to-b from-card to-muted/30 px-4">
              <div className="flex items-center gap-3">
                <SecpLogo
                  variant="mark"
                  className="size-11 shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-secp-blue-900/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase text-secp-blue-800 dark:text-blue-200">
                    Justiça Federal
                  </p>
                  <p className="text-xl font-black leading-6 tracking-normal">
                    SECP
                  </p>
                  <span className="mt-1 inline-flex max-w-44 rounded bg-secp-blue-900/10 px-2 py-0.5 text-[11px] font-semibold text-secp-blue-900 dark:bg-white/10 dark:text-blue-200">
                    <span className="truncate">{perfilAtivo.nome}</span>
                  </span>
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
