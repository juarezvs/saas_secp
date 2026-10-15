"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Ban,
  Bookmark,
  Braces,
  Building2,
  CalendarDays,
  CalendarClock,
  CalendarMinus,
  CalendarRange,
  CalendarX,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  Clock,
  ContactRound,
  DatabaseZap,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch,
  FileSpreadsheet,
  FileSignature,
  FileText,
  FlaskConical,
  Fingerprint,
  GraduationCap,
  Gauge,
  GitCompareArrows,
  History,
  Hourglass,
  KeyRound,
  Landmark,
  LifeBuoy,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MapPinned,
  MoreVertical,
  Network,
  Palette,
  Plane,
  RadioTower,
  ReceiptText,
  Scale,
  ScanFace,
  Search,
  ServerCog,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  ToggleLeft,
  TreePalm,
  Upload,
  Users,
  UsersRound,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import type {
  IconesItensCatalogoMenu,
  MenusPersonalizadosPorPerfil,
} from "@/modules/menus/domain/menu-personalizado";
import {
  PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
  PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  PERMISSOES_REGISTRO_PONTO_FACIAL,
} from "@/modules/auth/domain/constants/perfis-sistema";
import { PERMISSOES_TOTEM_REGISTRO } from "@/modules/totem/application/totem-permissoes";
import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";
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
import { useFavoritosPerfil } from "@/modules/favoritos/presentation/favoritos-provider";

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

export type RotinasSeccionalAtivas = {
  bancoHorasAtivo: boolean;
  horasExtrasAtivo: boolean;
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

const SUBITENS_SOLICITACOES_PONTO: MenuItem[] = [
  {
    label: "Ajuste de ponto",
    href: "/solicitacoes/nova?tipo=AJUSTE_PONTO",
    icon: Wrench,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Compensação",
    href: "/solicitacoes/nova?tipo=COMPENSACAO",
    icon: TimerReset,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Abono/justificativa",
    href: "/solicitacoes/nova?tipo=ABONO_JUSTIFICATIVA",
    icon: FileSignature,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Atividade externa",
    href: "/solicitacoes/nova?tipo=ATIVIDADE_EXTERNA",
    icon: MapPin,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Viagem a serviço",
    href: "/solicitacoes/nova?tipo=VIAGEM_SERVICO",
    icon: Plane,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Capacitação",
    href: "/solicitacoes/nova?tipo=CAPACITACAO",
    icon: GraduationCap,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Dispensa de ponto",
    href: "/solicitacoes/nova?tipo=DISPENSA_PONTO",
    icon: Ban,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Hora crédito prévia",
    href: "/solicitacoes/nova?tipo=HORA_CREDITO_PREVIA",
    icon: Clock,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Converter trabalho em dia especial",
    href: "/solicitacoes/nova?tipo=CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
    icon: CalendarClock,
    permissoes: ["solicitacoes:criar:proprio"],
  },
  {
    label: "Folga banco de horas",
    href: "/solicitacoes/nova?tipo=FOLGA_BANCO_HORAS",
    icon: CalendarMinus,
    permissoes: ["solicitacoes:criar:proprio"],
  },
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
    label: "Modo Totem",
    href: "/totem",
    icon: RadioTower,
    permissoes: PERMISSOES_TOTEM_REGISTRO,
  },
  {
    label: "Ponto de Hoje",
    href: "/marcacoes",
    icon: BadgeCheck,
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:seccional",
      "marcacoes:consultar:global",
    ],
  },
  {
    label: "Histórico de Marcações",
    href: "/historico-marcacoes",
    icon: History,
    permissoes: ["marcacoes:consultar:proprio", "marcacoes:visualizar:proprio"],
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
      "apuracao:consultar:seccional",
      "apuracao:consultar:global",
    ],
  },
  {
    label: "Acompanhamento de Estagio",
    href: "/acompanhamento-estagio",
    icon: ClipboardList,
    permissoes: [
      "acompanhamento-estagio:consultar:proprio",
      "acompanhamento-estagio:preencher:proprio",
      "acompanhamento-estagio:supervisionar:subordinados",
      "acompanhamento-estagio:consultar:seccional",
      "acompanhamento-estagio:exportar:seccional",
    ],
    children: [
      {
        label: "Meu acompanhamento",
        href: "/acompanhamento-estagio",
        icon: ClipboardList,
        permissoes: [
          "acompanhamento-estagio:consultar:proprio",
          "acompanhamento-estagio:preencher:proprio",
          "acompanhamento-estagio:supervisionar:subordinados",
        ],
      },
      {
        label: "Consulta de estagio",
        href: "/acompanhamento-estagio/consulta",
        icon: Search,
        permissoes: [
          "acompanhamento-estagio:consultar:seccional",
          "acompanhamento-estagio:exportar:seccional",
        ],
      },
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
        icon: Search,
        permissoes: ["banco-horas:consultar:global"],
        perfis: ["ADMIN", "ADMINISTRADOR", "GESTOR", "RH"],
      },
      {
        label: "Solicitações de banco de horas",
        href: "/banco-horas/solicitacoes",
        icon: ClipboardPenLine,
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
        icon: FileClock,
        permissoes: [
          "banco-horas:consultar:proprio",
          "banco-horas:consultar:chefia",
          "banco-horas:consultar:global",
        ],
      },
      {
        label: "Relatórios",
        href: "/banco-horas/relatorios",
        icon: FileSearch,
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
      "horas-extras:analisar:subordinados",
      "horas-extras:analisar:chefia",
      "horas-extras:responder-orcamento:seccional",
      "horas-extras:responder-orcamento:global",
      "horas-extras:deliberar:seccional",
      "horas-extras:visualizar-execucao:seccional",
      "horas-extras:visualizar-execucao:global",
      "horas-extras:visualizar-folha:seccional",
      "horas-extras:visualizar-folha:global",
      "horas-extras:deliberar:global",
      "horas-extras:cadastrar-autorizacao:seccional",
      "horas-extras:cadastrar-autorizacao:global",
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
        label: "Autorizações de horas-extras",
        href: "/horas-extras/autorizacoes",
        icon: FileCheck2,
        permissoes: [
          "horas-extras:cadastrar-autorizacao:seccional",
          "horas-extras:cadastrar-autorizacao:global",
          "horas-extras:visualizar-execucao:seccional",
          "horas-extras:visualizar-execucao:global",
        ],
      },
      {
        label: "Gestão",
        href: "/gestao/horas-extras",
        icon: ClipboardCheck,
        permissoes: [
          "horas-extras:analisar:subordinados",
          "horas-extras:analisar:chefia",
        ],
      },
      {
        label: "Orçamento",
        href: "/orcamento/horas-extras",
        icon: Landmark,
        permissoes: [
          "horas-extras:responder-orcamento:seccional",
          "horas-extras:responder-orcamento:global",
        ],
      },
      {
        label: "Deliberação",
        href: "/deliberacao/horas-extras",
        icon: Scale,
        permissoes: [
          "horas-extras:deliberar:seccional",
          "horas-extras:deliberar:global",
        ],
      },
      {
        label: "Execução",
        href: "/execucao/horas-extras",
        icon: Activity,
        permissoes: [
          "horas-extras:visualizar-execucao:seccional",
          "horas-extras:visualizar-execucao:global",
        ],
      },
      {
        label: "Folha",
        href: "/folha/horas-extras",
        icon: FileSpreadsheet,
        permissoes: [
          "horas-extras:visualizar-folha:seccional",
          "horas-extras:visualizar-folha:global",
          "horas-extras:gerar-lote:seccional",
          "horas-extras:gerar-lote:global",
        ],
      },
    ],
  },
  {
    label: "Solicitações de Ponto",
    href: "/solicitacoes",
    icon: ClipboardPenLine,
    ocultarQuandoAdministrativo: true,
    permissoes: [
      "solicitacoes:criar:proprio",
      "solicitacoes:consultar:proprio",
      "solicitacoes:analisar:subordinados",
      "solicitacoes:analisar:chefia",
      "solicitacoes:consultar:seccional",
      "solicitacoes:consultar:global",
    ],
    children: [
      {
        label: "Minhas solicitações",
        href: "/solicitacoes",
        icon: ListChecks,
        permissoes: [
          "solicitacoes:criar:proprio",
          "solicitacoes:consultar:proprio",
          "solicitacoes:analisar:subordinados",
          "solicitacoes:analisar:chefia",
          "solicitacoes:consultar:seccional",
          "solicitacoes:consultar:global",
        ],
      },
      ...SUBITENS_SOLICITACOES_PONTO,
    ],
  },
  {
    label: "Minha Equipe",
    href: "/minha-equipe/presencas",
    icon: UsersRound,
    somenteAdministrativo: true,
    permissoes: [
      "programacao-ferias:consultar:subordinados",
      "programacao-ferias:consultar:seccional",
      "programacao-ferias:consultar:global",
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
        label: "Solicitações de Férias",
        href: "/minha-equipe/ferias/solicitacoes",
        icon: ClipboardCheck,
        permissoes: ["programacao-ferias:analisar:subordinados"],
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
        label: "Solicitações de Ponto",
        href: "/solicitacoes",
        icon: ClipboardList,
        permissoes: [
          "solicitacoes:criar:proprio",
          "solicitacoes:consultar:proprio",
          "solicitacoes:analisar:chefia",
          "solicitacoes:consultar:global",
        ],
        children: [
          {
            label: "Minhas solicitações",
            href: "/solicitacoes",
            icon: ClipboardList,
            permissoes: [
              "solicitacoes:criar:proprio",
              "solicitacoes:consultar:proprio",
              "solicitacoes:analisar:chefia",
              "solicitacoes:consultar:global",
            ],
          },
          ...SUBITENS_SOLICITACOES_PONTO,
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
          "recesso:aceitar:seccional",
        ],
      },
      {
        label: "Espelho de ponto",
        href: "/espelho-ponto",
        icon: CalendarDays,
        permissoes: [
          "espelho-ponto:visualizar:proprio",
          "apuracao:consultar:seccional",
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
      "programacao-ferias:consultar:subordinados",
      "programacao-ferias:consultar:seccional",
      "programacao-ferias:consultar:global",
      "minha-equipe:consultar:subordinados",
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
        label: "Solicitações de Férias",
        href: "/minha-equipe/ferias/solicitacoes",
        icon: ClipboardCheck,
        permissoes: ["programacao-ferias:analisar:subordinados"],
      },
      {
        label: "Presentes/Ausentes/Licenças",
        href: "/minha-equipe/presencas",
        icon: UsersRound,
        permissoes: [
          "minha-equipe:consultar:subordinados",
          "minha-equipe:consultar:chefia",
        ],
      },
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
      "recesso:aceitar:seccional",
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
    label: "Cadastro",
    href: "/servidores",
    icon: Users,
    somenteAdministrativo: true,
    permissoes: [
      "servidores:gerenciar:global",
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:consultar:global",
      ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
    ],
    children: [
      {
        label: "Gestão de Pessoas",
        href: "/servidores",
        icon: Users,
        permissoes: [
          "servidores:gerenciar:global",
          "servidores:gerenciar:seccional",
          "servidores:consultar:seccional",
          "servidores:consultar:global",
          ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
        ],
      },
    ],
  },
  {
    label: "Manutenção",
    href: "/manutencao/marcacoes",
    icon: Wrench,
    permissoes: ["marcacao:manutencao:seccional", "marcacao:manutencao:global"],
    children: [
      {
        label: "Marcações",
        href: "/manutencao/marcacoes",
        icon: Fingerprint,
        permissoes: [
          "marcacao:manutencao:seccional",
          "marcacao:manutencao:global",
        ],
      },
    ],
  },
  {
    label: "MCT - Motor Classificação Temporal",
    href: "/administracao/mct/configuracao-apuracao",
    icon: Gauge,
    permissoes: [
      "mct-configuracao:consultar:seccional",
      "mct-configuracao:consultar:global",
      "mct-configuracao:gerenciar:seccional",
      "mct-configuracao:gerenciar:global",
      "mct-simulador:usar:seccional",
      "mct-simulador:usar:global",
    ],
    children: [
      {
        label: "Configuração da Apuração",
        href: "/administracao/mct/configuracao-apuracao",
        icon: Settings2,
        permissoes: [
          "mct-configuracao:consultar:seccional",
          "mct-configuracao:consultar:global",
          "mct-configuracao:gerenciar:seccional",
          "mct-configuracao:gerenciar:global",
        ],
      },
      {
        label: "Simulador de Jornada",
        href: "/administracao/mct/simulador",
        icon: FlaskConical,
        permissoes: ["mct-simulador:usar:seccional", "mct-simulador:usar:global"],
      },
      {
        label: "Validação e Comparação",
        href: "/administracao/mct/validacao",
        icon: GitCompareArrows,
        permissoes: [
          "mct-configuracao:consultar:seccional",
          "mct-configuracao:consultar:global",
          "mct-configuracao:gerenciar:seccional",
          "mct-configuracao:gerenciar:global",
        ],
      },
      {
        label: "Configurações Avançadas",
        href: "/cadastros-auxiliares/mct",
        icon: Braces,
        permissoes: [
          "mct-rubricas:consultar:seccional",
          "mct-rubricas:consultar:global",
          "mct-politicas:consultar:seccional",
          "mct-politicas:consultar:global",
          "mct-regras:consultar:seccional",
          "mct-regras:consultar:global",
        ],
      },
    ],
  },
  {
    label: "Cadastros Auxiliares",
    href: "/cadastros-auxiliares/tipos-feriados-suspensoes",
    icon: ListChecks,
    permissoes: [
      "tipoferiado:consultar:seccional",
      "tipoferiado:cadastrar:seccional",
      "tipoferiado:cadastrar:master",
      "localidade:consultar:seccional",
      "localidade:cadastrar:seccional",
      "localidade:cadastrar:master",
      "configuracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
      "mct-rubricas:consultar:seccional",
      "mct-rubricas:consultar:global",
      "mct-politicas:consultar:seccional",
      "mct-politicas:consultar:global",
      "mct-regras:consultar:seccional",
      "mct-regras:consultar:global",
    ],
    children: [
      {
        label: "Rubricas, políticas e regras MCT",
        href: "/cadastros-auxiliares/mct",
        icon: Braces,
        permissoes: [
          "mct-rubricas:consultar:seccional",
          "mct-rubricas:consultar:global",
          "mct-rubricas:gerenciar:seccional",
          "mct-rubricas:gerenciar:global",
          "mct-politicas:consultar:seccional",
          "mct-politicas:consultar:global",
          "mct-politicas:gerenciar:seccional",
          "mct-politicas:gerenciar:global",
          "mct-regras:consultar:seccional",
          "mct-regras:consultar:global",
          "mct-regras:gerenciar:seccional",
          "mct-regras:gerenciar:global",
        ],
      },
      {
        label: "Tipos de Feriados/Suspensões",
        href: "/cadastros-auxiliares/tipos-feriados-suspensoes",
        icon: CalendarRange,
        permissoes: [
          "tipoferiado:consultar:seccional",
          "tipoferiado:cadastrar:seccional",
          "tipoferiado:cadastrar:master",
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
      {
        label: "Estados/Cidades",
        href: "/cadastros-auxiliares/estados-cidades",
        icon: MapPinned,
        permissoes: [
          "localidade:consultar:seccional",
          "localidade:cadastrar:seccional",
          "localidade:cadastrar:master",
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
      {
        label: "Características pessoais",
        href: "/cadastros-auxiliares/caracteristicas-pessoais",
        icon: ContactRound,
        permissoes: [
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
    ],
  },
  {
    label: "Administração",
    href: "/administracao",
    icon: Settings,
    permissoes: [
      "configuracoes:gerenciar:seccional",
      "configuracoes:gerenciar:global",
      "usuarios:gerenciar:seccional",
      "usuarios:consultar:seccional",
      "usuarios:gerenciar:global",
      "usuarios:consultar:global",
      "perfis:gerenciar:seccional",
      "perfis:gerenciar:global",
      "unidades:gerenciar:seccional",
      "unidades:gerenciar:global",
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
      "servidores:gerenciar:global",
      "servidores:consultar:global",
      "jornadas:gerenciar:seccional",
      "jornadas:gerenciar:global",
      "chefias:gerenciar:seccional",
      "chefias:gerenciar:global",
      "afd:importar:seccional",
      "afd:importar:global",
      "apuracao:consultar:seccional",
      "apuracao:recalcular:seccional",
      "apuracao:consultar:global",
      "apuracao:recalcular:global",
      "integracoes:consultar:seccional",
      "integracoes:gerenciar:seccional",
      "integracoes:consultar:global",
      "integracoes:gerenciar:global",
      "regulamentacao-ponto:gerenciar:seccional",
      "regulamentacao-ponto:gerenciar:global",
      "procedimentos-frequencia:consultar:seccional",
      "procedimentos-frequencia:gerenciar:seccional",
      "procedimentos-frequencia:consultar:global",
      "procedimentos-frequencia:gerenciar:global",
      "banco-horas:gerenciar:seccional",
      "banco-horas:gerenciar:global",
      "horas-extras:configurar-politica:seccional",
      "horas-extras:configurar-workflow:seccional",
      "horas-extras:configurar-responsaveis:seccional",
      "horas-extras:configurar-politica:global",
      "horas-extras:configurar-workflow:global",
      "horas-extras:configurar-responsaveis:global",
      "fusos-horarios:gerenciar:global",
      "auditoria:consultar:global",
      "auditoria:detalhar:global",
      "menus:personalizar:global",
      "programacao-ferias:executar-sarh:seccional",
      "programacao-ferias:executar-sarh:global",
      ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
    ],
    children: [
      {
        label: "Configurações globais",
        href: "/administracao/configuracoes-globais",
        icon: Settings,
        permissoes: ["configuracoes:gerenciar:global"],
      },
      {
        label: "Liberação de Rotinas",
        href: "/administracao/liberacao-rotinas",
        icon: ToggleLeft,
        permissoes: [
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
      {
        label: "Suporte do login",
        href: "/administracao/suporte",
        icon: LifeBuoy,
        permissoes: [
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
      {
        label: "Perfis e permissões",
        href: "/perfis",
        icon: ShieldCheck,
        permissoes: ["perfis:gerenciar:seccional", "perfis:gerenciar:global"],
      },
      {
        label: "Usuários",
        href: "/usuarios",
        icon: UserCog,
        permissoes: [
          "usuarios:gerenciar:seccional",
          "usuarios:consultar:seccional",
          "usuarios:gerenciar:global",
          "usuarios:consultar:global",
        ],
      },
      {
        label: "Órgãos",
        href: "/orgaos",
        icon: Landmark,
        permissoes: [
          "unidades:gerenciar:seccional",
          "unidades:gerenciar:global",
        ],
      },
      {
        label: "Unidades",
        href: "/unidades",
        icon: Building2,
        permissoes: [
          "unidades:gerenciar:seccional",
          "unidades:gerenciar:global",
        ],
      },
      {
        label: "Chefias",
        href: "/chefias",
        icon: Network,
        permissoes: ["chefias:gerenciar:seccional", "chefias:gerenciar:global"],
      },
      {
        label: "Substituições automáticas",
        href: "/administracao/substituicoes-funcao?tipo=AUTOMATICA",
        icon: UsersRound,
      },
      {
        label: "Substituições de função",
        href: "/administracao/substituicoes-funcao",
        icon: UserCog,
      },
      {
        label: "Relatório de substituições",
        href: "/substituicoes-funcao/relatorio",
        icon: FileSpreadsheet,
      },
      {
        label: "Horário de Trabalho",
        href: "/jornadas",
        icon: CalendarClock,
        permissoes: [
          "jornadas:gerenciar:seccional",
          "jornadas:gerenciar:global",
        ],
      },
      {
        label: "AFD",
        href: "/afd",
        icon: Upload,
        permissoes: ["afd:importar:seccional", "afd:importar:global"],
      },
      {
        label: "Apuração",
        href: "/apuracao",
        icon: FileCheck2,
        permissoes: [
          "apuracao:consultar:seccional",
          "apuracao:recalcular:seccional",
          "apuracao:consultar:global",
          "apuracao:recalcular:global",
        ],
      },
      {
        label: "Regulamentação do ponto",
        href: "/administracao/regulamentacao-ponto",
        icon: SlidersHorizontal,
        permissoes: [
          "regulamentacao-ponto:gerenciar:seccional",
          "regulamentacao-ponto:gerenciar:global",
        ],
      },
      {
        label: "Procedimentos de frequência",
        href: "/administracao/procedimentos-frequencia",
        icon: ClipboardList,
        permissoes: [
          "procedimentos-frequencia:consultar:seccional",
          "procedimentos-frequencia:gerenciar:seccional",
          "procedimentos-frequencia:consultar:global",
          "procedimentos-frequencia:gerenciar:global",
        ],
      },
      {
        label: "Nada Consta",
        href: "/administracao/procedimentos-frequencia/nada-consta",
        icon: FileCheck2,
        permissoes: [
          "procedimentos-frequencia:emitir-nada-consta:seccional",
          "procedimentos-frequencia:emitir-nada-consta:global",
        ],
      },
      {
        label: "Gerenciar banco de horas",
        href: "/administracao/banco-horas",
        icon: Hourglass,
        permissoes: [
          "banco-horas:gerenciar:seccional",
          "banco-horas:gerenciar:global",
        ],
      },
      {
        label: "Horas extras",
        href: "/administracao/horas-extras",
        icon: FileCog,
        permissoes: [
          "horas-extras:configurar-politica:global",
          "horas-extras:configurar-politica:seccional",
          "horas-extras:configurar-workflow:seccional",
          "horas-extras:configurar-responsaveis:seccional",
          "horas-extras:configurar-workflow:global",
          "horas-extras:configurar-responsaveis:global",
        ],
      },
      {
        label: "Calendário institucional",
        href: "/administracao/calendario",
        icon: CalendarDays,
        permissoes: [
          "configuracoes:gerenciar:seccional",
          "configuracoes:gerenciar:global",
        ],
      },
      {
        label: "Férias SARH",
        href: "/administracao/ferias/integracao-sarh",
        icon: DatabaseZap,
        permissoes: [
          "programacao-ferias:executar-sarh:seccional",
          "programacao-ferias:executar-sarh:global",
        ],
      },
      {
        label: "Credenciais e integrações",
        href: "/administracao/integracoes",
        icon: KeyRound,
        permissoes: [
          "integracoes:consultar:global",
          "integracoes:consultar:seccional",
          "integracoes:gerenciar:seccional",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Integração SARH",
        href: "/administracao/integracoes/sarh",
        icon: DatabaseZap,
      },
      {
        label: "Active Directory",
        href: "/administracao/integracoes/ldap",
        icon: Network,
      },
      {
        label: "Microsoft Teams",
        href: "/administracao/integracoes/teams",
        icon: Users,
      },
      {
        label: "Fusos horários",
        href: "/administracao/fusos-horarios",
        icon: Clock,
      },
      {
        label: "Saúde dos Workers",
        href: "/administracao/workers",
        icon: ServerCog,
        permissoes: [
          "configuracoes:gerenciar:global",
          "configuracoes:gerenciar:seccional",
          "integracoes:gerenciar:seccional",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Equipamentos biométricos",
        href: "/equipamentos",
        icon: RadioTower,
        permissoes: [
          "integracoes:consultar:global",
          "integracoes:consultar:seccional",
          "integracoes:gerenciar:seccional",
          "integracoes:gerenciar:global",
        ],
      },
      {
        label: "Auditoria",
        href: "/auditoria",
        icon: ShieldAlert,
        permissoes: [
          "auditoria:consultar:seccional",
          "auditoria:detalhar:seccional",
          "auditoria:consultar:global",
          "auditoria:detalhar:global",
        ],
      },
    ],
  },
];

const permissoesCatalogoPorHref = new Map(
  MENU_CATALOGO.map((item) => [item.href, item.permissoes ?? []]),
);

export function aplicarPermissoesCatalogoMenu(itens: MenuItem[]): MenuItem[] {
  return itens.map((item) => {
    const permissoesCatalogo = permissoesCatalogoPorHref.get(item.href) ?? [];

    return {
      ...item,
      permissoes: Array.from(
        new Set([...(item.permissoes ?? []), ...permissoesCatalogo]),
      ),
      children: item.children
        ? aplicarPermissoesCatalogoMenu(item.children)
        : undefined,
    };
  });
}

export const MENU_ITEMS_COM_PERMISSOES_CATALOGO =
  aplicarPermissoesCatalogoMenu(MENU_ITEMS);

type SidebarProps = {
  recolhida: boolean;
  drawerAberto: boolean;
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  iconesItensCatalogo?: IconesItensCatalogoMenu;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
  rotinasSeccional?: RotinasSeccionalAtivas;
  onDesktopOpenChange: (open: boolean) => void;
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

function itemCorrespondeAoPath(
  pathname: string,
  href: string,
  searchParams?: URLSearchParams,
) {
  const [hrefPath, hrefQuery] = href.split("?");

  if (hrefQuery) {
    if (pathname !== hrefPath) {
      return false;
    }

    const paramsHref = new URLSearchParams(hrefQuery);

    return Array.from(paramsHref.entries()).every(
      ([chave, valor]) => searchParams?.get(chave) === valor,
    );
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function dataTourMenuItem(href: string) {
  return `menu-${href.split("?")[0]}`;
}

function perfilEhAdministrativoNavegacao(perfilAtivo: PerfilNavegacao) {
  return Boolean(perfilAtivo.administrativo);
}

function filtrarItensVisiveis(
  itens: MenuItem[],
  perfilAtivo: PerfilNavegacao,
  rotinasSeccional?: RotinasSeccionalAtivas,
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
        ? filtrarItensVisiveis(
            item.children,
            perfilAtivo,
            rotinasSeccional,
            nivel + 1,
          )
        : undefined,
    }))
    .filter((item) => {
      if (
        rotinasSeccional?.bancoHorasAtivo === false &&
        (item.href.startsWith("/banco-horas") ||
          item.href === "/administracao/banco-horas" ||
          item.href.includes("FOLGA_BANCO_HORAS") ||
          item.href.includes("HORA_CREDITO_PREVIA"))
      ) {
        return false;
      }

      if (
        rotinasSeccional?.horasExtrasAtivo === false &&
        (item.href.startsWith("/horas-extras") ||
          item.href.includes("/horas-extras") ||
          item.href === "/administracao/horas-extras")
      ) {
        return false;
      }

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

function normalizarBuscaMenu(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrarItensPorBusca(itens: MenuItem[], busca: string): MenuItem[] {
  const termo = normalizarBuscaMenu(busca);
  if (!termo) return itens;

  return itens.flatMap((item) => {
    if (normalizarBuscaMenu(item.label).includes(termo)) return [item];

    const filhos = item.children
      ? filtrarItensPorBusca(item.children, busca)
      : [];

    return filhos.length ? [{ ...item, children: filhos }] : [];
  });
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

function iconeItemCatalogoPersonalizado(
  nome: string | null | undefined,
  fallback: LucideIcon,
): LucideIcon {
  const chave = nome?.trim();

  if (!chave) {
    return fallback;
  }

  const iconeLucide = (LucideIcons as Record<string, unknown>)[chave];

  return ehComponenteIconeLucide(iconeLucide)
    ? (iconeLucide as LucideIcon)
    : fallback;
}

function aplicarIconesItensCatalogo(
  itens: MenuItem[],
  iconesItensCatalogo?: IconesItensCatalogoMenu,
): MenuItem[] {
  if (!iconesItensCatalogo || Object.keys(iconesItensCatalogo).length === 0) {
    return itens;
  }

  return itens.map((item) => ({
    ...item,
    icon: iconeItemCatalogoPersonalizado(
      iconesItensCatalogo[item.href],
      item.icon,
    ),
    children: item.children
      ? aplicarIconesItensCatalogo(item.children, iconesItensCatalogo)
      : undefined,
  }));
}

function montarItensPersonalizados(params: {
  itensPadraoVisiveis: MenuItem[];
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
}): MenuItem[] {
  const { itensPadraoVisiveis, perfilAtivo, menusPersonalizados } = params;
  // O catÃ¡logo filtrado por permissÃµes Ã© a fonte Ãºnica do menu. Assim, uma
  // permissÃ£o atribuÃ­da a qualquer perfil aparece imediatamente no grupo certo.
  void perfilAtivo;
  void menusPersonalizados;
  return itensPadraoVisiveis;

  /* istanbul ignore next -- compatibilidade temporÃ¡ria com dados legados */
  const menuPerfil = (perfilAtivo.id
    ? menusPersonalizados?.[perfilAtivo.id!]
    : undefined)!;

  if (!menuPerfil) return itensPadraoVisiveis;

  if (
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

    if (itemPadrao && !itemPodeSerExibido(itemPadrao, perfilAtivo)) {
      return null;
    }

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

function obterItemAtivo(
  pathname: string,
  itens: MenuItem[],
  searchParams?: URLSearchParams,
) {
  return achatarItens(itens)
    .filter((item) => itemCorrespondeAoPath(pathname, item.href, searchParams))
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
      "Content-Type": "application/json; charset=utf-8",
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
                className={["size-2.5 shrink-0 rounded-full", item.classe].join(
                  " ",
                )}
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
  iconesItensCatalogo,
  rotinasSeccional,
  onNavigate,
}: {
  recolhida: boolean;
  perfilAtivo: PerfilNavegacao;
  menusPersonalizados?: MenusPersonalizadosPorPerfil;
  iconesItensCatalogo?: IconesItensCatalogoMenu;
  rotinasSeccional?: RotinasSeccionalAtivas;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { favoritos, isFavorito, favoritar, desfavoritar } =
    useFavoritosPerfil();
  const [favoritoPendente, setFavoritoPendente] = useState<string | null>(null);
  const [buscaMenu, setBuscaMenu] = useState("");
  const itensPadraoComIcones = useMemo(
    () =>
      aplicarIconesItensCatalogo(
        MENU_ITEMS_COM_PERMISSOES_CATALOGO,
        iconesItensCatalogo,
      ),
    [iconesItensCatalogo],
  );
  const itensPadraoVisiveis = useMemo(
    () =>
      filtrarItensVisiveis(itensPadraoComIcones, perfilAtivo, rotinasSeccional),
    [itensPadraoComIcones, perfilAtivo, rotinasSeccional],
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
  const itensFiltrados = useMemo(
    () => filtrarItensPorBusca(itensVisiveis, buscaMenu),
    [itensVisiveis, buscaMenu],
  );
  const favoritosFiltrados = useMemo(() => {
    const termo = normalizarBuscaMenu(buscaMenu);
    return termo
      ? favoritos.filter((favorito) =>
          normalizarBuscaMenu(favorito.titulo).includes(termo),
        )
      : favoritos;
  }, [buscaMenu, favoritos]);
  const itemAtivo = useMemo(
    () => obterItemAtivo(pathname, itensVisiveis, searchParams),
    [pathname, searchParams, itensVisiveis],
  );
  const hrefAtivo = itemAtivo?.href;
  const [gruposAlternados, setGruposAlternados] = useState<
    Record<string, boolean>
  >({});
  const grupoFavoritosAberto = gruposAlternados.__favoritos ?? true;

  function alternarGrupo(href: string, abertoAtual: boolean) {
    setGruposAlternados((gruposAtuais) => ({
      ...gruposAtuais,
      [href]: !abertoAtual,
    }));
  }

  function idCatalogoDoHref(href: string) {
    return MENU_CATALOGO.find((item) => item.href === href)?.id ?? null;
  }

  async function alternarFavorito(href: string) {
    const itemCatalogo = idCatalogoDoHref(href);
    if (!itemCatalogo || favoritoPendente) return;
    setFavoritoPendente(itemCatalogo);
    try {
      if (isFavorito(itemCatalogo)) await desfavoritar(itemCatalogo);
      else await favoritar(itemCatalogo);
    } finally {
      setFavoritoPendente(null);
    }
  }

  function MenuFavorito({ href, label }: { href: string; label: string }) {
    const itemCatalogo = idCatalogoDoHref(href);
    if (!itemCatalogo) return null;
    const ativo = isFavorito(itemCatalogo);
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Mais opções para ${label}`}
            title="Mais opções"
            className="grid size-7 shrink-0 place-items-center rounded-sm transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring dark:hover:bg-white/10"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="right"
            align="start"
            sideOffset={6}
            className="z-[100] min-w-40 rounded-md border border-border bg-card p-1 text-card-foreground shadow-lg"
          >
            <DropdownMenu.Item asChild>
              <Toggle
                pressed={ativo}
                disabled={favoritoPendente === itemCatalogo}
                onPressedChange={() => void alternarFavorito(href)}
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-start px-3 shadow-none"
              >
                <Bookmark
                  className={ativo ? "fill-current" : ""}
                  aria-hidden="true"
                />
                <span>{ativo ? "Desfavoritar" : "Favoritar"}</span>
              </Toggle>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col"
      aria-label={`Menu do perfil ${perfilAtivo.nome}`}
      data-tour="menu-lateral"
    >
      <div className="secp-sidebar-search sticky top-0 z-10 border-b border-border/80 px-3 py-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 opacity-70"
            aria-hidden="true"
          />
          <span className="sr-only">Buscar no menu</span>
          <input
            type="search"
            value={buscaMenu}
            onChange={(event) => setBuscaMenu(event.target.value)}
            placeholder="Buscar no menu"
            className="h-9 w-full rounded-sm border border-current/25 bg-transparent pl-8 pr-3 text-[13px] outline-none transition-colors placeholder:opacity-60 focus:border-[var(--secp-theme-accent)]"
          />
        </label>
      </div>

      <ul className="space-y-0.5 overflow-y-auto px-2 py-2">
        {favoritosFiltrados.length > 0 && (
          <li className="space-y-0.5 border-b border-border/80 pb-2">
            <button
              type="button"
              onClick={() => alternarGrupo("__favoritos", grupoFavoritosAberto)}
              aria-expanded={grupoFavoritosAberto}
              className="secp-sidebar-item flex min-h-8 w-full items-center gap-2 rounded-sm bg-white px-2 py-1.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-secp-blue-900/10 hover:text-secp-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              data-tour="menu-favoritos"
            >
              <ChevronDown
                className={[
                  "size-3.5 shrink-0 -rotate-90 transition-transform",
                  grupoFavoritosAberto ? "rotate-0" : "",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 break-words leading-5">
                Meus Favoritos
              </span>
            </button>
            {grupoFavoritosAberto ? (
              <ul className="ml-3 space-y-0.5 border-l border-border pl-2">
                {favoritosFiltrados.map((favorito) => {
                  const favoritoAtivo = itemCorrespondeAoPath(
                    pathname,
                    favorito.href,
                    searchParams,
                  );
                  const itemPai = itensVisiveis.find(
                    (item) =>
                      item.href === favorito.href ||
                      item.children?.some(
                        (child) => child.href === favorito.href,
                      ),
                  );
                  const itemOriginal =
                    itemPai?.href === favorito.href
                      ? itemPai
                      : itemPai?.children?.find(
                          (child) => child.href === favorito.href,
                        );
                  const FavoritoIcon = itemOriginal?.icon;

                  return (
                    <li
                      key={favorito.id}
                      className={[
                        "secp-sidebar-subitem flex min-h-8 items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] font-medium transition",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        favoritoAtivo
                          ? "bg-secp-blue-900/10 text-secp-blue-900 dark:bg-white/10 dark:text-white"
                          : "bg-white text-slate-600 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <a
                        href={favorito.href}
                        onClick={onNavigate}
                        className="flex min-w-0 flex-1 items-center gap-2"
                        data-tour={dataTourMenuItem(favorito.href)}
                      >
                        {FavoritoIcon ? (
                          <FavoritoIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 break-words leading-5">
                          {favorito.titulo}
                        </span>
                      </a>
                      <MenuFavorito
                        href={favorito.href}
                        label={favorito.titulo}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        )}
        {itensFiltrados.map((item) => {
          const Icon = item.icon;
          const filhos = item.children ?? [];
          const possuiFilhos = filhos.length > 0;
          const ativo = item.href === itemAtivo?.href;
          const filhoAtivo = filhos.some((child) => child === itemAtivo);
          const grupoAtivo = ativo || filhoAtivo;
          const grupoAberto = buscaMenu
            ? true
            : (gruposAlternados[item.href] ?? grupoAtivo);
          const mostrarFilhos = possuiFilhos && !recolhida && grupoAberto;
          const itemClassName = [
            "secp-sidebar-item",
            "flex min-h-8 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] font-medium transition",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            grupoAtivo
              ? "bg-secp-blue-900 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
            recolhida ? "justify-center" : "",
          ].join(" ");

          return (
            <li key={`${item.href}:${item.label}`} className="space-y-1">
              {possuiFilhos && !recolhida ? (
                <div
                  aria-current={grupoAtivo ? "page" : undefined}
                  className={itemClassName}
                  data-tour={dataTourMenuItem(item.href)}
                >
                  <button
                    type="button"
                    onClick={() => alternarGrupo(item.href, grupoAberto)}
                    aria-expanded={mostrarFilhos}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={[
                        "size-3.5 shrink-0 -rotate-90 transition-transform",
                        mostrarFilhos ? "rotate-0" : "",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-words leading-5">
                      {item.label}
                    </span>
                  </button>
                  <MenuFavorito href={item.href} label={item.label} />
                </div>
              ) : (
                <div
                  className={itemClassName}
                  aria-current={grupoAtivo ? "page" : undefined}
                >
                  <a
                    href={
                      possuiFilhos ? (filhos[0]?.href ?? item.href) : item.href
                    }
                    onClick={onNavigate}
                    aria-label={recolhida ? item.label : undefined}
                    title={recolhida ? item.label : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2"
                    data-tour={dataTourMenuItem(
                      possuiFilhos ? (filhos[0]?.href ?? item.href) : item.href,
                    )}
                  >
                    {!recolhida && <span className="size-3.5 shrink-0" />}
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {!recolhida && (
                      <span className="min-w-0 flex-1 break-words leading-5">
                        {item.label}
                      </span>
                    )}
                  </a>
                  {!recolhida ? (
                    <MenuFavorito href={item.href} label={item.label} />
                  ) : null}
                </div>
              )}

              {mostrarFilhos && (
                <ul className="ml-3 space-y-0.5 border-l border-border pl-2">
                  {filhos.map((child) => {
                    const ChildIcon = child.icon;
                    const childAtivo = child.href === hrefAtivo;

                    return (
                      <li key={`${child.href}:${child.label}`}>
                        <div
                          aria-current={childAtivo ? "page" : undefined}
                          className={[
                            "secp-sidebar-subitem",
                            "flex min-h-8 items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] font-medium transition",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            childAtivo
                              ? "bg-secp-blue-900/10 text-secp-blue-900 dark:bg-white/10 dark:text-white"
                              : "bg-white text-slate-600 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                          ].join(" ")}
                        >
                          <a
                            href={child.href}
                            onClick={onNavigate}
                            className="flex min-w-0 flex-1 items-center gap-2"
                            data-tour={dataTourMenuItem(child.href)}
                          >
                            <ChildIcon
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 break-words leading-5">
                              {child.label}
                            </span>
                          </a>
                          <MenuFavorito href={child.href} label={child.label} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {itensFiltrados.length === 0 && favoritosFiltrados.length === 0 && (
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
  iconesItensCatalogo,
  preferenciasAcessibilidade,
  rotinasSeccional,
  onDesktopOpenChange,
  onFecharDrawer,
}: SidebarProps) {
  return (
    <>
      <Sheet open={!recolhida} onOpenChange={onDesktopOpenChange}>
        <SheetContent
          id="secp-sidebar-desktop"
          className="secp-sidebar hidden w-[22rem] p-0 lg:flex"
          exibirFechar={false}
          overlayClassName="hidden lg:block"
          aria-describedby="secp-sidebar-desktop-description"
        >
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <SheetDescription
            id="secp-sidebar-desktop-description"
            className="sr-only"
          >
            Menu lateral do perfil {perfilAtivo.nome}.
          </SheetDescription>
          <div className="flex min-h-0 flex-1 flex-col">
            <MenuPrincipal
              recolhida={false}
              perfilAtivo={perfilAtivo}
              menusPersonalizados={menusPersonalizados}
              iconesItensCatalogo={iconesItensCatalogo}
              rotinasSeccional={rotinasSeccional}
              onNavigate={() => onDesktopOpenChange(false)}
            />
            <ThemeSelector
              recolhida={false}
              preferenciasAcessibilidade={preferenciasAcessibilidade}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={drawerAberto}
        onOpenChange={(open) => !open && onFecharDrawer()}
      >
        <SheetContent
          id="secp-sidebar-mobile"
          className="secp-sidebar w-[min(24rem,94vw)] p-0 lg:hidden"
          exibirFechar={false}
          overlayClassName="lg:hidden"
          aria-describedby="secp-sidebar-mobile-description"
        >
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <SheetDescription
            id="secp-sidebar-mobile-description"
            className="sr-only"
          >
            Menu lateral do perfil {perfilAtivo.nome}.
          </SheetDescription>
          <div className="flex min-h-0 flex-1 flex-col">
            <MenuPrincipal
              recolhida={false}
              perfilAtivo={perfilAtivo}
              menusPersonalizados={menusPersonalizados}
              iconesItensCatalogo={iconesItensCatalogo}
              rotinasSeccional={rotinasSeccional}
              onNavigate={onFecharDrawer}
            />
            <ThemeSelector
              recolhida={false}
              preferenciasAcessibilidade={preferenciasAcessibilidade}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
