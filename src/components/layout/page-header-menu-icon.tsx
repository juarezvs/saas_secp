"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Ban,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarMinus,
  CalendarRange,
  CalendarX,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  Clock,
  DatabaseZap,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch,
  FileSpreadsheet,
  FileSignature,
  FileText,
  Fingerprint,
  GraduationCap,
  History,
  Hourglass,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MapPin,
  Network,
  Palette,
  Plane,
  RadioTower,
  ReceiptText,
  Scale,
  ScanFace,
  ServerCog,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  ToggleLeft,
  TreePalm,
  Upload,
  UserCog,
  Users,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type IconeMenuRota = {
  href: string;
  icon: LucideIcon;
};

const ICONES_MENU_ROTAS: IconeMenuRota[] = [
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/marcacoes/registrar", icon: Fingerprint },
  { href: "/marcacoes", icon: BadgeCheck },
  { href: "/historico-marcacoes", icon: History },
  { href: "/marcacoes-brutas", icon: DatabaseZap },
  { href: "/espelho-ponto", icon: CalendarDays },
  { href: "/meu-contracheque", icon: ReceiptText },
  { href: "/meus-afastamentos", icon: CalendarX },
  { href: "/minhas-ferias", icon: TreePalm },
  { href: "/banco-horas/solicitacoes", icon: ClipboardPenLine },
  { href: "/banco-horas/chefia", icon: UsersRound },
  { href: "/banco-horas/vencimentos", icon: FileClock },
  { href: "/banco-horas/relatorios", icon: FileSearch },
  { href: "/banco-horas", icon: Hourglass },
  { href: "/horas-extras/nova", icon: CalendarClock },
  { href: "/horas-extras", icon: CalendarClock },
  { href: "/gestao/horas-extras", icon: ClipboardCheck },
  { href: "/orcamento/horas-extras", icon: Landmark },
  { href: "/deliberacao/horas-extras", icon: Scale },
  { href: "/execucao/horas-extras", icon: Activity },
  { href: "/folha/horas-extras", icon: FileSpreadsheet },
  { href: "/solicitacoes/nova?tipo=AJUSTE_PONTO", icon: Wrench },
  { href: "/solicitacoes/nova?tipo=COMPENSACAO", icon: TimerReset },
  { href: "/solicitacoes/nova?tipo=ABONO_JUSTIFICATIVA", icon: FileSignature },
  { href: "/solicitacoes/nova?tipo=ATIVIDADE_EXTERNA", icon: MapPin },
  { href: "/solicitacoes/nova?tipo=VIAGEM_SERVICO", icon: Plane },
  { href: "/solicitacoes/nova?tipo=CAPACITACAO", icon: GraduationCap },
  { href: "/solicitacoes/nova?tipo=DISPENSA_PONTO", icon: Ban },
  { href: "/solicitacoes/nova?tipo=HORA_CREDITO_PREVIA", icon: Clock },
  { href: "/solicitacoes/nova?tipo=FOLGA_BANCO_HORAS", icon: CalendarMinus },
  { href: "/solicitacoes", icon: ClipboardPenLine },
  { href: "/minha-equipe/ferias", icon: CalendarDays },
  { href: "/minha-equipe/presencas", icon: UsersRound },
  { href: "/homologacao", icon: ShieldCheck },
  { href: "/boletim-frequencia", icon: FileSpreadsheet },
  { href: "/recesso-forense", icon: CalendarRange },
  { href: "/relatorios", icon: FileText },
  { href: "/painel-executivo", icon: BarChart3 },
  { href: "/biometria", icon: ScanFace },
  { href: "/administracao/liberacao-rotinas", icon: ToggleLeft },
  { href: "/administracao/personalizar-menu", icon: Palette },
  { href: "/administracao/regulamentacao-ponto", icon: SlidersHorizontal },
  { href: "/administracao/procedimentos-frequencia", icon: ClipboardList },
  {
    href: "/administracao/procedimentos-frequencia/nada-consta",
    icon: FileCheck2,
  },
  { href: "/administracao/banco-horas", icon: Hourglass },
  { href: "/administracao/horas-extras", icon: FileCog },
  { href: "/administracao/calendario", icon: CalendarDays },
  { href: "/administracao/integracoes", icon: KeyRound },
  { href: "/administracao/workers", icon: ServerCog },
  { href: "/administracao", icon: Settings },
  { href: "/perfis", icon: ShieldCheck },
  { href: "/usuarios", icon: UserCog },
  { href: "/orgaos", icon: Landmark },
  { href: "/unidades", icon: Building2 },
  { href: "/servidores", icon: Users },
  { href: "/chefias", icon: Network },
  { href: "/jornadas", icon: CalendarClock },
  { href: "/afd", icon: Upload },
  { href: "/apuracao", icon: FileCheck2 },
  { href: "/equipamentos", icon: RadioTower },
  { href: "/auditoria", icon: ShieldAlert },
];

function normalizarHref(href: string) {
  const [pathname, search = ""] = href.split("?");

  return {
    pathname: pathname.replace(/\/+$/, "") || "/dashboard",
    search,
  };
}

function rotaCorresponde(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const rota = normalizarHref(href);
  const pathnameAtual = pathname.replace(/\/+$/, "") || "/dashboard";

  if (rota.search) {
    if (pathnameAtual !== rota.pathname) {
      return false;
    }

    const paramsRota = new URLSearchParams(rota.search);

    return Array.from(paramsRota.entries()).every(
      ([chave, valor]) => searchParams.get(chave) === valor,
    );
  }

  return (
    pathnameAtual === rota.pathname ||
    pathnameAtual.startsWith(`${rota.pathname}/`)
  );
}

export function PageHeaderMenuIcon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const item = ICONES_MENU_ROTAS.find((rota) =>
    rotaCorresponde(pathname, searchParams, rota.href),
  );

  if (!item) {
    return null;
  }

  const Icon = item.icon;

  return (
    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-inherit">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
