"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  CalendarX,
  ChevronDown,
  ClipboardList,
  Clock,
  Cpu,
  DatabaseZap,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  History,
  Hourglass,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Network,
  Palette,
  ReceiptText,
  Scale,
  ScanFace,
  ServerCog,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  TreePalm,
  Upload,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { SecpLogo } from "@/components/brand/secp-logo";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import type { MenusPersonalizadosPorPerfil } from "@/modules/menus/domain/menu-personalizado";
import {
  PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
  PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  PERMISSOES_REGISTRO_PONTO_FACIAL,
} from "@/modules/auth/domain/constants/perfis-sistema";
import {
  PERMISSAO_PAINEL_EXECUTIVO,
  PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS,
  PERMISSOES_SUBMENUS_PAINEL_EXECUTIVO,
  paineisExecutivos,
} from "@/modules/painel-executivo/presentation/painel-executivo-data";
import type {
  PreferenciasAcessibilidade,
  TemaVisualAcessibilidade,
} from "@/modules/auth/application/services/preferencias-acessibilidade.service";

export type PerfilNavegacao = {
  id?: string;
  codigo: string;
  nome: string;
  descricao?: string;
  permissoes?: string[];
  administrativo?: boolean;
  excecao?: boolean;
  perfilDestinoExcecaoId?: string | null;
};

export type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissoes?: string[];
  perfis?: string[];
  somenteAdministrativo?: boolean;
  ocultarQuandoAdministrativo?: boolean;
  children?: MenuItem[];
};

type TemaVisual = TemaVisualAcessibilidade;

const STORAGE_TEMA_VISUAL = "secp-color-theme";

const TEMAS_VISUAIS: Array<{
  valor: TemaVisual;
  label: string;
  classe: string;
}> = [
  { valor: "padrao", label: "Padrão", classe: "bg-white" },
  { valor: "azul", label: "Azul", classe: "bg-[#002f6c]" },
  { valor: "verde", label: "Verde", classe: "bg-[#007a33]" },
  { valor: "cinza", label: "Cinza", classe: "bg-[#97999b]" },
];

export const MENU_ITEMS: MenuItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Registrar Ponto",
    href: "/marcacoes/registrar",
    icon: Fingerprint,
    permissoes: PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  },
  {
    label: "Ponto de Hoje",
    href: "/marcacoes",
    icon: Clock,
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:global",
    ],
  },
  {
    label: "Histórico de Marcações",
    href: "/historico-marcacoes",
    icon: History,
    permissoes: [
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
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
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "espelho-ponto:visualizar:proprio",
      "apuracao:consultar:global",
    ],
  },
  {
    label: "Meu contracheque",
    href: "/meu-contracheque",
    icon: ReceiptText,
    permissoes: ["contracheque:consultar:proprio"],
    perfis: ["SERVIDOR"],
  },
  {
    label: "Meus afastamentos",
    href: "/meus-afastamentos",
    icon: CalendarX,
    permissoes: ["afastamentos:consultar:proprio"],
  },
  {
    label: "Minhas férias",
    href: "/minhas-ferias",
    icon: TreePalm,
    permissoes: [
      "programacao-ferias:consultar:proprio",
      "afastamentos:consultar:proprio",
    ],
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
    children: [
      {
        label: "Meu banco",
        href: "/banco-horas",
        icon: Hourglass,
        permissoes: [
          "banco-horas:visualizar:proprio",
          "banco-horas:consultar:proprio",
        ],
      },
      {
        label: "Banco da equipe",
        href: "/banco-horas",
        icon: UsersRound,
        permissoes: ["banco-horas:consultar:chefia"],
        perfis: ["CHEFIA"],
      },
      {
        label: "Consulta de banco de horas",
        href: "/banco-horas",
        icon: Hourglass,
        permissoes: ["banco-horas:consultar:global"],
        perfis: ["ADMIN", "ADMINISTRADOR", "GESTOR", "RH"],
      },
      {
        label: "Solicitacoes de banco de horas",
        href: "/banco-horas/solicitacoes",
        icon: ClipboardList,
        permissoes: ["solicitacoes:criar:proprio"],
      },
      {
        label: "Painel da chefia",
        href: "/banco-horas/chefia",
        icon: UsersRound,
        permissoes: ["banco-horas:consultar:chefia"],
      },
      {
        label: "Vencimentos",
        href: "/banco-horas/vencimentos",
        icon: CalendarClock,
        permissoes: [
          "banco-horas:consultar:proprio",
          "banco-horas:consultar:chefia",
          "banco-horas:consultar:global",
        ],
      },
      {
        label: "Relatorios",
        href: "/banco-horas/relatorios",
        icon: FileText,
        permissoes: [
          "relatorios:consultar:proprio",
          "relatorios:consultar:global",
          "relatorios-gerenciais:consultar:chefia",
          "relatorios-gerenciais:consultar:global",
        ],
      },
    ],
  },
  {
    label: "Horas extras",
    href: "/horas-extras",
    icon: CalendarClock,
    permissoes: [
      "horas-extras:visualizar:proprio",
      "horas-extras:solicitar:proprio",
      "horas-extras:analisar:chefia",
      "horas-extras:visualizar-execucao:global",
      "horas-extras:visualizar-folha:global",
      "horas-extras:deliberar:global",
    ],
    children: [
      {
        label: "Minhas solicitações",
        href: "/horas-extras",
        icon: CalendarClock,
        permissoes: [
          "horas-extras:visualizar:proprio",
          "horas-extras:solicitar:proprio",
        ],
      },
      {
        label: "Gestão",
        href: "/gestao/horas-extras",
        icon: ClipboardList,
        permissoes: ["horas-extras:analisar:chefia"],
      },
      {
        label: "Orçamento",
        href: "/orcamento/horas-extras",
        icon: Landmark,
        permissoes: ["horas-extras:responder-orcamento:global"],
      },
      {
        label: "Deliberação",
        href: "/deliberacao/horas-extras",
        icon: Scale,
        permissoes: ["horas-extras:deliberar:global"],
      },
      {
        label: "Execução",
        href: "/execucao/horas-extras",
        icon: Activity,
        permissoes: ["horas-extras:visualizar-execucao:global"],
      },
      {
        label: "Folha",
        href: "/folha/horas-extras",
        icon: FileSpreadsheet,
        permissoes: [
          "horas-extras:visualizar-folha:global",
          "horas-extras:gerar-lote:global",
        ],
      },
    ],
  },
  {
    label: "Solicitacoes de ajuste",
    href: "/solicitacoes",
    icon: ClipboardList,
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "solicitacoes:criar:proprio",
      "solicitacoes:consultar:proprio",
      "solicitacoes:analisar:chefia",
      "solicitacoes:consultar:global",
    ],
  },
  {
    label: "Minha Equipe",
    href: "/minha-equipe/presencas",
    icon: UsersRound,
    somenteAdministrativo: true,
    permissoes: [
      "minha-equipe:consultar:subordinados",
      "minha-equipe:consultar:seccional",
      "minha-equipe:consultar:global",
      "minha-equipe:consultar:chefia",
    ],
    children: [
      {
        label: "Programação de Férias",
        href: "/minha-equipe/ferias",
        icon: CalendarDays,
        permissoes: [
          "programacao-ferias:consultar:subordinados",
          "programacao-ferias:consultar:seccional",
          "programacao-ferias:consultar:global",
        ],
      },
      {
        label: "Presentes/Ausentes/Licenças",
        href: "/minha-equipe/presencas",
        icon: UsersRound,
        permissoes: [
          "minha-equipe:consultar:subordinados",
          "minha-equipe:consultar:seccional",
          "minha-equipe:consultar:global",
          "minha-equipe:consultar:chefia",
        ],
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
        label: "Solicitacoes de ajuste",
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
        label: "Recesso Forense",
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
        label: "Espelho de ponto",
        href: "/espelho-ponto",
        icon: CalendarDays,
        permissoes: [
          "espelho-ponto:visualizar:proprio",
          "apuracao:consultar:global",
        ],
      },
    ],
  },
  {
    label: "Minha Equipe",
    href: "/minha-equipe/presencas",
    icon: UsersRound,
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "minha-equipe:consultar:subordinados",
      "minha-equipe:consultar:chefia",
    ],
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
    icon: FileText,
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
      ...PERMISSOES_SUBMENUS_PAINEL_EXECUTIVO,
    ],
    children: paineisExecutivos.map((painel) => ({
      label: painel.menuLabel,
      href: `/painel-executivo/${painel.slug}`,
      icon: painel.icon,
      permissoes: [
        PERMISSAO_PAINEL_EXECUTIVO,
        ...(painel.slug === "equipamentos-de-ponto"
          ? [PERMISSAO_PAINEL_EXECUTIVO_EQUIPAMENTOS]
          : []),
        ...(painel.permissao ? [painel.permissao] : []),
      ],
    })),
  },
  {
    label: "Biometria facial",
    href: "/biometria",
    icon: ScanFace,
    permissoes: [
      ...PERMISSOES_REGISTRO_PONTO_FACIAL,
      ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
    ],
    children: [
      {
        label: "Meu cadastro/validação",
        href: "/biometria",
        icon: ScanFace,
        permissoes: PERMISSOES_REGISTRO_PONTO_FACIAL,
      },
      {
        label: "Cadastro de terceiros",
        href: "/servidores",
        icon: Users,
        permissoes: PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
      },
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
      "servidores:gerenciar:global",
      "servidores:consultar:global",
      "jornadas:gerenciar:global",
      "chefias:gerenciar:global",
      "afd:importar:global",
      "apuracao:consultar:global",
      "apuracao:recalcular:global",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
      "regulamentacao-ponto:gerenciar:global",
      "banco-horas:gerenciar:global",
      "horas-extras:configurar-politica:global",
      "horas-extras:configurar-workflow:global",
      "horas-extras:configurar-responsaveis:global",
      "fusos-horarios:gerenciar:global",
      "auditoria:consultar:global",
      "auditoria:detalhar:global",
      "menus:personalizar:global",
      ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
    ],
    children: [
      {
        label: "Liberação de Rotinas",
        href: "/administracao/liberacao-rotinas",
        icon: ToggleLeft,
        permissoes: ["configuracoes:gerenciar:global"],
      },
      {
        label: "Personalizar Menu",
        href: "/administracao/personalizar-menu",
        icon: Palette,
        permissoes: ["menus:personalizar:global"],
      },
      {
        label: "Perfis e permissões",
        href: "/perfis",
        icon: ShieldCheck,
        permissoes: ["perfis:gerenciar:global"],
      },
      {
        label: "Usuários",
        href: "/usuarios",
        icon: UsersRound,
        permissoes: ["usuarios:gerenciar:global", "usuarios:consultar:global"],
      },
      {
        label: "Órgãos",
        href: "/orgaos",
        icon: Landmark,
        permissoes: ["unidades:gerenciar:global"],
      },
      {
        label: "Unidades",
        href: "/unidades",
        icon: Building2,
        permissoes: ["unidades:gerenciar:global"],
      },
      {
        label: "Servidores",
        href: "/servidores",
        icon: Users,
        permissoes: [
          "servidores:gerenciar:global",
          "servidores:consultar:global",
          ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
        ],
      },
      {
        label: "Estagiarios",
        href: "/estagiarios",
        icon: Users,
        permissoes: [
          "servidores:gerenciar:global",
          "servidores:consultar:global",
          ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
        ],
      },
      {
        label: "Prestadores",
        href: "/prestadores",
        icon: Users,
        permissoes: [
          "servidores:gerenciar:global",
          "servidores:consultar:global",
          ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
        ],
      },
      {
        label: "Voluntarios",
        href: "/voluntarios",
        icon: Users,
        permissoes: [
          "servidores:gerenciar:global",
          "servidores:consultar:global",
          ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
        ],
      },
      {
        label: "Chefias",
        href: "/chefias",
        icon: Network,
        permissoes: ["chefias:gerenciar:global"],
      },
      {
        label: "Jornadas",
        href: "/jornadas",
        icon: CalendarClock,
        permissoes: ["jornadas:gerenciar:global"],
      },
      {
        label: "AFD",
        href: "/afd",
        icon: Upload,
        permissoes: ["afd:importar:global"],
      },
      {
        label: "Apuração",
        href: "/apuracao",
        icon: FileCheck2,
        permissoes: ["apuracao:consultar:global", "apuracao:recalcular:global"],
      },
      {
        label: "Regulamentação do ponto",
        href: "/administracao/regulamentacao-ponto",
        icon: SlidersHorizontal,
        permissoes: ["regulamentacao-ponto:gerenciar:global"],
      },
      {
        label: "Gerenciar banco de horas",
        href: "/administracao/banco-horas",
        icon: Clock,
        permissoes: ["banco-horas:gerenciar:global"],
      },
      {
        label: "Horas extras",
        href: "/administracao/horas-extras",
        icon: SlidersHorizontal,
        permissoes: [
          "horas-extras:configurar-politica:global",
          "horas-extras:configurar-workflow:global",
          "horas-extras:configurar-responsaveis:global",
        ],
      },
      {
        label: "Calendário institucional",
        href: "/administracao/calendario",
        icon: CalendarDays,
        permissoes: ["configuracoes:gerenciar:global"],
      },
      {
        label: "Credenciais e integrações",
        href: "/administracao/integracoes",
        icon: KeyRound,
        permissoes: [
          "integracoes:consultar:global",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Saúde dos Workers",
        href: "/administracao/workers",
        icon: ServerCog,
        permissoes: [
          "configuracoes:gerenciar:global",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Equipamentos biométricos",
        href: "/equipamentos",
        icon: Cpu,
        permissoes: [
          "integracoes:consultar:global",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Auditoria",
        href: "/auditoria",
        icon: ShieldAlert,
        permissoes: ["auditoria:consultar:global", "auditoria:detalhar:global"],
      },
    ],
  },
];

type SidebarProps = {
  recolhida: boolean;
  drawerAberto: boolean;
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
  instituicaoLabel: string;
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

  const perfilPermitido = item.perfis
    ? item.perfis.includes(perfilAtivo.codigo?.toUpperCase())
    : true;

  if (!item.permissoes || item.permissoes.length === 0) {
    return perfilPermitido;
  }

  return (
    perfilPermitido &&
    possuiAlgumaPermissaoNaLista(perfilAtivo.permissoes, item.permissoes)
  );
}

function itemCorrespondeAoPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function perfilEhAdministrativoNavegacao(perfilAtivo: PerfilNavegacao) {
  return Boolean(perfilAtivo.administrativo);
}

function filtrarItensVisiveis(
  itens: MenuItem[],
  perfilAtivo: PerfilNavegacao,
  nivel = 0,
): MenuItem[] {
  const perfilAdministrativo = perfilEhAdministrativoNavegacao(perfilAtivo);
  const hrefsMovidosParaMinhaEquipeAdministrativa = new Set([
    "/homologacao",
    "/recesso-forense",
  ]);

  return itens
    .map((item) => ({
      ...item,
      children: item.children
        ? filtrarItensVisiveis(item.children, perfilAtivo, nivel + 1)
        : undefined,
    }))
    .filter((item) => {
      if (item.somenteAdministrativo && !perfilAdministrativo) {
        return false;
      }

      if (item.ocultarQuandoAdministrativo && perfilAdministrativo) {
        return false;
      }

      if (
        nivel === 0 &&
        perfilAdministrativo &&
        hrefsMovidosParaMinhaEquipeAdministrativa.has(item.href)
      ) {
        return false;
      }

      return itemPodeSerExibido(item, perfilAtivo);
    });
}

function achatarItens(itens: MenuItem[]): MenuItem[] {
  return itens.flatMap((item) => [
    item,
    ...(item.children ? achatarItens(item.children) : []),
  ]);
}

function clonarItemMenu(item: MenuItem, label?: string | null): MenuItem {
  return {
    ...item,
    label: label || item.label,
    children: item.children?.map((child) => clonarItemMenu(child)),
  };
}

function montarIndiceItens(itens: MenuItem[]) {
  return new Map(achatarItens(itens).map((item) => [item.href, item]));
}

function ehComponenteIconeLucide(componente: unknown) {
  return (
    typeof componente === "function" ||
    (typeof componente === "object" &&
      componente !== null &&
      "$$typeof" in componente)
  );
}

function iconeGrupoPersonalizado(nome?: string | null): LucideIcon {
  const chave = nome?.trim().toLowerCase();
  const aliases: Record<string, string> = {
    administracao: "Settings",
    banco: "Hourglass",
    calendario: "CalendarDays",
    configurador: "Settings",
    equipe: "UsersRound",
    integracoes: "PlugZap",
    menu: "Menu",
    painel: "BarChart3",
    relatorios: "FileText",
    settings: "Settings",
    users: "UsersRound",
  };
  const nomeIcone = chave ? (aliases[chave] ?? nome?.trim()) : undefined;
  const iconeLucide = nomeIcone
    ? (LucideIcons as Record<string, unknown>)[nomeIcone]
    : undefined;

  return ehComponenteIconeLucide(iconeLucide)
    ? (iconeLucide as LucideIcon)
    : Settings;
}

function montarItensPersonalizados(params: {
  itensPadraoVisiveis: MenuItem[];
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
}): MenuItem[] {
  const { itensPadraoVisiveis, perfilAtivo, menusPersonalizados } = params;
  const menuPerfil = perfilAtivo.id
    ? menusPersonalizados?.[perfilAtivo.id]
    : undefined;

  if (
    !menuPerfil ||
    (menuPerfil.grupos.length === 0 && menuPerfil.itensRaiz.length === 0)
  ) {
    return itensPadraoVisiveis;
  }

  const indiceItens = montarIndiceItens(itensPadraoVisiveis);
  const montarItem = (item: {
    itemCatalogo: string;
    label?: string | null;
    ativo: boolean;
  }) => {
    if (!item.ativo) {
      return null;
    }

    const itemPadrao = indiceItens.get(item.itemCatalogo);

    return itemPadrao ? clonarItemMenu(itemPadrao, item.label) : null;
  };

  const itensRaiz = [...menuPerfil.itensRaiz]
    .sort((a, b) => a.ordem - b.ordem)
    .map(montarItem)
    .filter((item): item is MenuItem => Boolean(item));

  const grupos = [...menuPerfil.grupos]
    .filter((grupo) => grupo.ativo)
    .sort((a, b) => a.ordem - b.ordem)
    .map((grupo): MenuItem | null => {
      const children = [...grupo.itens]
        .sort((a, b) => a.ordem - b.ordem)
        .map(montarItem)
        .filter((item): item is MenuItem => Boolean(item));

      if (children.length === 0) {
        return null;
      }

      return {
        label: grupo.label,
        href: children[0]?.href ?? "/dashboard",
        icon: iconeGrupoPersonalizado(grupo.icone || grupo.label),
        children,
      };
    })
    .filter((item): item is MenuItem => Boolean(item));

  return [...itensRaiz, ...grupos];
}

function obterItemAtivo(pathname: string, itens: MenuItem[]) {
  return achatarItens(itens)
    .filter((item) => itemCorrespondeAoPath(pathname, item.href))
    .sort((a, b) => {
      const diferencaTamanho = b.href.length - a.href.length;

      if (diferencaTamanho !== 0) {
        return diferencaTamanho;
      }

      return b.label.localeCompare(a.label);
    })[0];
}

function aplicarTemaVisual(tema: TemaVisual) {
  if (tema === "padrao") {
    delete document.documentElement.dataset.secpColorTheme;
  } else {
    document.documentElement.dataset.secpColorTheme = tema;
  }

  window.localStorage.setItem(STORAGE_TEMA_VISUAL, tema);
}

function persistirTemaVisual(
  preferenciasAtuais: PreferenciasAcessibilidade,
  temaVisual: TemaVisual,
) {
  return fetch("/api/sessao/acessibilidade", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...preferenciasAtuais,
      temaVisual,
    }),
  });
}

function ThemeSelector({
  recolhida,
  preferenciasAcessibilidade,
}: {
  recolhida: boolean;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
}) {
  const [tema, setTema] = useState<TemaVisual>(
    preferenciasAcessibilidade.temaVisual,
  );

  useEffect(() => {
    const temaArmazenado = preferenciasAcessibilidade.temaVisual;

    if (
      temaArmazenado === "padrao" ||
      temaArmazenado === "azul" ||
      temaArmazenado === "verde" ||
      temaArmazenado === "cinza"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restaura a preferência visual salva no navegador após a hidratação.
      setTema(temaArmazenado);
      aplicarTemaVisual(temaArmazenado);
      window.dispatchEvent(
        new CustomEvent<TemaVisual>("secp:tema-visual", {
          detail: temaArmazenado,
        }),
      );
    }
  }, [preferenciasAcessibilidade.temaVisual]);

  function selecionarTema(novoTema: TemaVisual) {
    setTema(novoTema);
    aplicarTemaVisual(novoTema);
    window.dispatchEvent(
      new CustomEvent<TemaVisual>("secp:tema-visual", {
        detail: novoTema,
      }),
    );
    void persistirTemaVisual(preferenciasAcessibilidade, novoTema).catch(
      () => undefined,
    );
  }

  return (
    <div
      className={[
        "secp-sidebar-theme-selector",
        "border-t border-border/80 px-3 py-3",
        recolhida ? "flex justify-center" : "space-y-2",
      ].join(" ")}
    >
      {!recolhida && (
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Palette className="size-4" aria-hidden="true" />
          <span>Tema visual</span>
        </div>
      )}
      <div
        className={[
          "gap-1.5",
          recolhida ? "flex flex-col items-center" : "grid grid-cols-2",
        ].join(" ")}
        role="group"
        aria-label="Selecionar tema visual"
      >
        {TEMAS_VISUAIS.map((item) => {
          const ativo = item.valor === tema;

          return (
            <button
              key={item.valor}
              type="button"
              onClick={() => selecionarTema(item.valor)}
              className={[
                "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-1.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "secp-theme-choice",
                ativo
                  ? "secp-theme-choice-active"
                  : "secp-theme-choice-inactive",
                recolhida ? "w-9 px-0" : "w-full",
              ].join(" ")}
              aria-pressed={ativo}
              aria-label={`Usar tema ${item.label}`}
              title={`Tema ${item.label}`}
            >
              <span
                className={["size-2.5 shrink-0 rounded-full", item.classe].join(" ")}
                aria-hidden="true"
              />
              {!recolhida && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MenuPrincipal({
  recolhida,
  perfilAtivo,
  menusPersonalizados,
  onNavigate,
}: {
  recolhida: boolean;
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const itensPadraoVisiveis = useMemo(
    () => filtrarItensVisiveis(MENU_ITEMS, perfilAtivo),
    [perfilAtivo],
  );
  const itensVisiveis = useMemo(
    () =>
      montarItensPersonalizados({
        itensPadraoVisiveis,
        perfilAtivo,
        menusPersonalizados,
      }),
    [itensPadraoVisiveis, perfilAtivo, menusPersonalizados],
  );
  const itemAtivo = useMemo(
    () => obterItemAtivo(pathname, itensVisiveis),
    [pathname, itensVisiveis],
  );
  const hrefAtivo = itemAtivo?.href;
  const [gruposAlternados, setGruposAlternados] = useState<
    Record<string, boolean>
  >({});

  function alternarGrupo(href: string, abertoAtual: boolean) {
    setGruposAlternados((gruposAtuais) => ({
      ...gruposAtuais,
      [href]: !abertoAtual,
    }));
  }

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
          const ativo = item.href === itemAtivo?.href;
          const filhoAtivo = filhos.some((child) => child === itemAtivo);
          const grupoAtivo = ativo || filhoAtivo;
          const grupoAberto = gruposAlternados[item.href] ?? grupoAtivo;
          const mostrarFilhos = possuiFilhos && !recolhida && grupoAberto;
          const itemClassName = [
            "secp-sidebar-item",
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            grupoAtivo
              ? "bg-secp-blue-900 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
            recolhida ? "justify-center" : "",
          ].join(" ");

          return (
            <li key={`${item.href}:${item.label}`} className="space-y-1">
              {possuiFilhos && !recolhida ? (
                <button
                  type="button"
                  onClick={() => alternarGrupo(item.href, grupoAberto)}
                  aria-current={grupoAtivo ? "page" : undefined}
                  aria-expanded={mostrarFilhos}
                  className={itemClassName}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {item.label}
                  </span>
                  <ChevronDown
                    className={[
                      "size-4 shrink-0 transition-transform",
                      mostrarFilhos ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <a
                  href={
                    possuiFilhos ? (filhos[0]?.href ?? item.href) : item.href
                  }
                  onClick={onNavigate}
                  aria-current={grupoAtivo ? "page" : undefined}
                  aria-label={recolhida ? item.label : undefined}
                  title={recolhida ? item.label : undefined}
                  className={itemClassName}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {!recolhida && (
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                  )}
                </a>
              )}

              {mostrarFilhos && (
                <ul className="ml-4 space-y-1 border-l border-border pl-2">
                  {filhos.map((child) => {
                    const ChildIcon = child.icon;
                    const childAtivo = child.href === hrefAtivo;

                    return (
                      <li key={`${child.href}:${child.label}`}>
                        <a
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={childAtivo ? "page" : undefined}
                          className={[
                            "secp-sidebar-subitem",
                            "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            childAtivo
                              ? "bg-secp-blue-900/10 text-secp-blue-900 dark:bg-white/10 dark:text-white"
                              : "bg-white text-slate-600 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                          ].join(" ")}
                        >
                          <ChildIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {child.label}
                          </span>
                        </a>
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
  menusPersonalizados,
  preferenciasAcessibilidade,
  instituicaoLabel,
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
          "secp-sidebar",
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card text-card-foreground shadow-card transition-[width] duration-300 lg:flex",
          recolhida ? "w-20" : "w-72",
        ].join(" ")}
        aria-label="Menu principal"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={[
              "secp-sidebar-header",
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
                  {instituicaoLabel}
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
          <MenuPrincipal
            recolhida={recolhida}
            perfilAtivo={perfilAtivo}
            menusPersonalizados={menusPersonalizados}
          />
          <ThemeSelector
            recolhida={recolhida}
            preferenciasAcessibilidade={preferenciasAcessibilidade}
          />
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
          <aside className="secp-sidebar relative flex h-full w-[min(20rem,88vw)] flex-col bg-card text-card-foreground shadow-floating">
            <div className="secp-sidebar-header flex h-[4.5rem] items-center justify-between border-b border-border/80 bg-gradient-to-b from-card to-muted/30 px-4">
              <div className="flex items-center gap-3">
                <SecpLogo
                  variant="mark"
                  className="size-11 shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-secp-blue-900/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase text-secp-blue-800 dark:text-blue-200">
                    {instituicaoLabel}
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
              menusPersonalizados={menusPersonalizados}
              onNavigate={onFecharDrawer}
            />
            <ThemeSelector
              recolhida={false}
              preferenciasAcessibilidade={preferenciasAcessibilidade}
            />
          </aside>
        </div>
      )}
    </>
  );
}
