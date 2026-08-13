import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Clock3,
  Cpu,
  FileCheck2,
  FileText,
  KeyRound,
  MessageSquare,
  Network,
  Palette,
  Settings,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  Upload,
  UserRoundCheck,
  Users,
  UsersRound,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";

const PERMISSOES_ADMINISTRACAO = [
  "configuracoes:gerenciar:seccional",
  "configuracoes:gerenciar:global",
  "banco-horas:gerenciar:seccional",
  "banco-horas:gerenciar:global",
  "integracoes-teams:visualizar:global",
  "menus:personalizar:seccional",
  "menus:personalizar:global",
  "procedimentos-frequencia:consultar:seccional",
  "procedimentos-frequencia:consultar:global",
  "substituicoes-funcao:consultar:seccional",
  "substituicoes-funcao:consultar:global",
];

type CardAdministracao = {
  titulo: string;
  descricao: string;
  href: string;
  icon: typeof Settings;
  permissoes?: string[];
};

export default async function AdministracaoPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar(
    PERMISSOES_ADMINISTRACAO,
  );
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdPadrao = escopoOrgao.global
    ? null
    : (escopoOrgao.orgaoIds[0] ?? null);
  const hrefComOrgao = (href: string) =>
    orgaoIdPadrao
      ? `${href}?${new URLSearchParams({ orgaoId: orgaoIdPadrao }).toString()}`
      : href;

  const cards: CardAdministracao[] = [
    {
      titulo: "Liberação de rotinas",
      descricao: "Controle a disponibilidade operacional das rotinas liberadas aos perfis.",
      href: "/administracao/liberacao-rotinas",
      icon: ToggleLeft,
      permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"],
    },
    {
      titulo: "Personalizar menu",
      descricao: "Ajuste grupos, nomes, ícones e ordem do menu lateral por perfil.",
      href: "/administracao/personalizar-menu",
      icon: Palette,
      permissoes: ["menus:personalizar:seccional", "menus:personalizar:global"],
    },
    {
      titulo: "Perfis e permissões",
      descricao: "Gerencie papéis, permissões e escopos institucionais.",
      href: "/perfis",
      icon: ShieldCheck,
      permissoes: ["perfis:gerenciar:seccional", "perfis:gerenciar:global"],
    },
    {
      titulo: "Usuários",
      descricao: "Administre contas, vínculos de perfil e escopo de atuação.",
      href: hrefComOrgao("/usuarios"),
      icon: UsersRound,
      permissoes: ["usuarios:consultar:seccional", "usuarios:gerenciar:seccional", "usuarios:consultar:global", "usuarios:gerenciar:global"],
    },
    {
      titulo: "Órgãos",
      descricao: "Consulte e mantenha as seccionais usadas pelo SECP.",
      href: hrefComOrgao("/orgaos"),
      icon: Building2,
      permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
    },
    {
      titulo: "Unidades",
      descricao: "Mantenha a estrutura organizacional e as vinculações administrativas.",
      href: hrefComOrgao("/unidades"),
      icon: Building2,
      permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
    },
    {
      titulo: "Servidores",
      descricao: "Gerencie servidores, vínculos funcionais, usuários e lotações.",
      href: hrefComOrgao("/servidores"),
      icon: Users,
      permissoes: ["servidores:consultar:seccional", "servidores:gerenciar:seccional", "servidores:consultar:global", "servidores:gerenciar:global"],
    },
    {
      titulo: "Chefias",
      descricao: "Gerencie gestores, substitutos, delegações e responsáveis por unidades.",
      href: hrefComOrgao("/chefias"),
      icon: Network,
      permissoes: ["chefias:gerenciar:seccional", "chefias:gerenciar:global"],
    },
    {
      titulo: "Substituições de função",
      descricao: "Cadastre titulares, substitutos, atos e períodos de substituição.",
      href: "/administracao/substituicoes-funcao",
      icon: UserRoundCheck,
      permissoes: ["substituicoes-funcao:consultar:seccional", "substituicoes-funcao:gerenciar:seccional", "substituicoes-funcao:consultar:global", "substituicoes-funcao:gerenciar:global"],
    },
    {
      titulo: "Relatório de substituições",
      descricao: "Consulte substituições ocorridas com base nas ausências do titular.",
      href: "/substituicoes-funcao/relatorio",
      icon: FileText,
      permissoes: ["substituicoes-funcao:relatorio:proprio", "substituicoes-funcao:relatorio:subordinados", "substituicoes-funcao:relatorio:seccional", "substituicoes-funcao:relatorio:global"],
    },
    {
      titulo: "Jornadas",
      descricao: "Cadastre jornadas, escalas e atribuições aplicáveis às pessoas.",
      href: hrefComOrgao("/jornadas"),
      icon: CalendarClock,
      permissoes: ["jornadas:gerenciar:seccional", "jornadas:gerenciar:global"],
    },
    {
      titulo: "AFD",
      descricao: "Importe arquivos AFD e acompanhe o processamento das marcações.",
      href: "/afd",
      icon: Upload,
      permissoes: ["afd:importar:seccional", "afd:importar:global"],
    },
    {
      titulo: "Apuração",
      descricao: "Consulte e recalcule apurações diárias e mensais de frequência.",
      href: hrefComOrgao("/apuracao"),
      icon: FileCheck2,
      permissoes: ["apuracao:consultar:seccional", "apuracao:recalcular:seccional", "apuracao:consultar:global", "apuracao:recalcular:global"],
    },
    {
      titulo: "Regulamentação do ponto",
      descricao: "Configure limites, prazos, tolerâncias e regras por seccional.",
      href: hrefComOrgao("/administracao/regulamentacao-ponto"),
      icon: SlidersHorizontal,
      permissoes: ["regulamentacao-ponto:gerenciar:seccional", "regulamentacao-ponto:gerenciar:global"],
    },
    {
      titulo: "Procedimentos de frequência",
      descricao: "Parametrize e execute procedimentos administrativos por seccional.",
      href: "/administracao/procedimentos-frequencia",
      icon: FileText,
      permissoes: ["procedimentos-frequencia:consultar:seccional", "procedimentos-frequencia:gerenciar:seccional", "procedimentos-frequencia:consultar:global", "procedimentos-frequencia:gerenciar:global"],
    },
    {
      titulo: "Nada Consta de frequência",
      descricao: "Emita e registre o Nada Consta no motor de procedimentos.",
      href: "/administracao/procedimentos-frequencia/nada-consta",
      icon: FileCheck2,
      permissoes: ["procedimentos-frequencia:emitir-nada-consta:seccional", "procedimentos-frequencia:emitir-nada-consta:global"],
    },
    {
      titulo: "Banco de horas",
      descricao: "Defina saldos, implantação e transferências excepcionais.",
      href: hrefComOrgao("/administracao/banco-horas"),
      icon: Clock3,
      permissoes: ["banco-horas:gerenciar:seccional", "banco-horas:gerenciar:global"],
    },
    {
      titulo: "Horas extras",
      descricao: "Configure políticas, responsáveis e fluxos de aprovação.",
      href: "/administracao/horas-extras",
      icon: SlidersHorizontal,
      permissoes: ["horas-extras:configurar-politica:seccional", "horas-extras:configurar-workflow:seccional", "horas-extras:configurar-responsaveis:seccional", "horas-extras:configurar-politica:global", "horas-extras:configurar-workflow:global", "horas-extras:configurar-responsaveis:global"],
    },
    {
      titulo: "Calendário institucional",
      descricao: "Cadastre feriados, pontos facultativos e suspensões.",
      href: "/administracao/calendario",
      icon: CalendarDays,
      permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"],
    },
    {
      titulo: "Fusos horários",
      descricao: "Gerencie fusos usados por órgãos, unidades e jornadas.",
      href: "/administracao/fusos-horarios",
      icon: Clock3,
      permissoes: ["fusos-horarios:gerenciar:global"],
    },
    {
      titulo: "Credenciais e integrações",
      descricao: "Configure SARH, Active Directory e relógios por seccional.",
      href: hrefComOrgao("/administracao/integracoes"),
      icon: KeyRound,
      permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Microsoft Teams",
      descricao: "Configure bot, abas, notificações e manifesto do aplicativo Teams.",
      href: "/administracao/integracoes/teams",
      icon: MessageSquare,
      permissoes: ["integracoes-teams:visualizar:global", "integracoes-teams:configurar:global"],
    },
    {
      titulo: "Saúde dos workers",
      descricao: "Monitore filas, workers automáticos e eventos de execução.",
      href: "/administracao/workers",
      icon: ServerCog,
      permissoes: ["configuracoes:gerenciar:seccional", "integracoes:gerenciar:seccional", "configuracoes:gerenciar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Equipamentos biométricos",
      descricao: "Cadastre relógios, REP, totens e dispositivos de marcação.",
      href: hrefComOrgao("/equipamentos"),
      icon: Cpu,
      permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Auditoria",
      descricao: "Consulte trilhas, alterações sensíveis e dados antes/depois.",
      href: "/auditoria",
      icon: ShieldAlert,
      permissoes: ["auditoria:consultar:seccional", "auditoria:detalhar:seccional", "auditoria:consultar:global", "auditoria:detalhar:global"],
    },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Administração" }]} />

      <PageHeader
        icon={Settings}
        titulo="Administração do SECP"
        descricao="Configurações técnicas, regras institucionais, permissões, integrações e cadastros de apoio."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {cards
          .filter((card) =>
            (card.permissoes ?? ["configuracoes:gerenciar:global"]).some(
              (permissaoCard) =>
                usuarioPossuiPermissaoNoPerfil(
                  permissao.perfilAtivoCodigo,
                  permissao.permissoes,
                  permissaoCard,
                ),
            ),
          )
          .map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex min-h-40 flex-col justify-between rounded-lg border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-black leading-5">{card.titulo}</h2>
                  <span className="secp-theme-icon flex size-9 shrink-0 items-center justify-center rounded-lg group-hover:bg-secp-blue-900 group-hover:text-white">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">
                  {card.descricao}
                </p>
              </Link>
            );
          })}
      </section>
    </div>
  );
}
