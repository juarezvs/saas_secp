import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Clock3,
  Cpu,
  DatabaseZap,
  FileCheck2,
  FileText,
  KeyRound,
  LifeBuoy,
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
  "programacao-ferias:executar-sarh:seccional",
  "programacao-ferias:executar-sarh:global",
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
      titulo: "LiberaÃ§Ã£o de rotinas",
      descricao: "Controle a disponibilidade operacional das rotinas liberadas aos perfis.",
      href: "/administracao/liberacao-rotinas",
      icon: ToggleLeft,
      permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"],
    },
    {
      titulo: "Suporte do login",
      descricao: "Cadastre a URL da ferramenta aberta pelo botão Solicitar Suporte.",
      href: "/administracao/suporte",
      icon: LifeBuoy,
      permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"],
    },
    {
      titulo: "Personalizar menu",
      descricao: "Ajuste grupos, nomes, Ã­cones e ordem do menu lateral por perfil.",
      href: "/administracao/personalizar-menu",
      icon: Palette,
      permissoes: ["menus:personalizar:seccional", "menus:personalizar:global"],
    },
    {
      titulo: "Perfis e permissÃµes",
      descricao: "Gerencie papÃ©is, permissÃµes e escopos institucionais.",
      href: "/perfis",
      icon: ShieldCheck,
      permissoes: ["perfis:gerenciar:seccional", "perfis:gerenciar:global"],
    },
    {
      titulo: "UsuÃ¡rios",
      descricao: "Administre contas, vÃ­nculos de perfil e escopo de atuaÃ§Ã£o.",
      href: hrefComOrgao("/usuarios"),
      icon: UsersRound,
      permissoes: ["usuarios:consultar:seccional", "usuarios:gerenciar:seccional", "usuarios:consultar:global", "usuarios:gerenciar:global"],
    },
    {
      titulo: "Ã“rgÃ£os",
      descricao: "Consulte e mantenha as seccionais usadas pelo SECP.",
      href: hrefComOrgao("/orgaos"),
      icon: Building2,
      permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
    },
    {
      titulo: "Unidades",
      descricao: "Mantenha a estrutura organizacional e as vinculaÃ§Ãµes administrativas.",
      href: hrefComOrgao("/unidades"),
      icon: Building2,
      permissoes: ["unidades:gerenciar:seccional", "unidades:gerenciar:global"],
    },
    {
      titulo: "Servidores",
      descricao: "Gerencie servidores, vÃ­nculos funcionais, usuÃ¡rios e lotaÃ§Ãµes.",
      href: hrefComOrgao("/servidores"),
      icon: Users,
      permissoes: ["servidores:consultar:seccional", "servidores:gerenciar:seccional", "servidores:consultar:global", "servidores:gerenciar:global"],
    },
    {
      titulo: "Chefias",
      descricao: "Gerencie gestores, substitutos, delegaÃ§Ãµes e responsÃ¡veis por unidades.",
      href: hrefComOrgao("/chefias"),
      icon: Network,
      permissoes: ["chefias:gerenciar:seccional", "chefias:gerenciar:global"],
    },
    {
      titulo: "Cadastro de substituicao automatica",
      descricao: "Consulte titulares e substitutos automaticos por unidade.",
      href: "/administracao/substituicoes-funcao?tipo=AUTOMATICA",
      icon: UserRoundCheck,
      permissoes: ["substituicoes-funcao:consultar:seccional", "substituicoes-funcao:gerenciar:seccional", "substituicoes-funcao:consultar:global", "substituicoes-funcao:gerenciar:global"],
    },
    {
      titulo: "Substituicoes de funcao",
      descricao: "Cadastre atos e periodos efetivos de substituicao.",
      href: "/administracao/substituicoes-funcao",
      icon: UserRoundCheck,
      permissoes: ["substituicoes-funcao:consultar:seccional", "substituicoes-funcao:gerenciar:seccional", "substituicoes-funcao:consultar:global", "substituicoes-funcao:gerenciar:global"],
    },
    {
      titulo: "RelatÃ³rio de substituiÃ§Ãµes",
      descricao: "Consulte substituiÃ§Ãµes ocorridas com base nas ausÃªncias do titular.",
      href: "/substituicoes-funcao/relatorio",
      icon: FileText,
      permissoes: ["substituicoes-funcao:relatorio:proprio", "substituicoes-funcao:relatorio:subordinados", "substituicoes-funcao:relatorio:seccional", "substituicoes-funcao:relatorio:global"],
    },
    {
      titulo: "HorÃ¡rio de Trabalho",
      descricao: "Cadastre horÃ¡rios, escalas e atribuiÃ§Ãµes aplicÃ¡veis Ã s pessoas.",
      href: hrefComOrgao("/jornadas"),
      icon: CalendarClock,
      permissoes: ["jornadas:gerenciar:seccional", "jornadas:gerenciar:global"],
    },
    {
      titulo: "AFD",
      descricao: "Importe arquivos AFD e acompanhe o processamento das marcaÃ§Ãµes.",
      href: "/afd",
      icon: Upload,
      permissoes: ["afd:importar:seccional", "afd:importar:global"],
    },
    {
      titulo: "ApuraÃ§Ã£o",
      descricao: "Consulte e recalcule apuraÃ§Ãµes diÃ¡rias e mensais de frequÃªncia.",
      href: hrefComOrgao("/apuracao"),
      icon: FileCheck2,
      permissoes: ["apuracao:consultar:seccional", "apuracao:recalcular:seccional", "apuracao:consultar:global", "apuracao:recalcular:global"],
    },
    {
      titulo: "RegulamentaÃ§Ã£o do ponto",
      descricao: "Configure limites, prazos, tolerÃ¢ncias e regras por seccional.",
      href: hrefComOrgao("/administracao/regulamentacao-ponto"),
      icon: SlidersHorizontal,
      permissoes: ["regulamentacao-ponto:gerenciar:seccional", "regulamentacao-ponto:gerenciar:global"],
    },
    {
      titulo: "Procedimentos de frequÃªncia",
      descricao: "Parametrize e execute procedimentos administrativos por seccional.",
      href: "/administracao/procedimentos-frequencia",
      icon: FileText,
      permissoes: ["procedimentos-frequencia:consultar:seccional", "procedimentos-frequencia:gerenciar:seccional", "procedimentos-frequencia:consultar:global", "procedimentos-frequencia:gerenciar:global"],
    },
    {
      titulo: "Nada Consta de frequÃªncia",
      descricao: "Emita e registre o Nada Consta no motor de procedimentos.",
      href: "/administracao/procedimentos-frequencia/nada-consta",
      icon: FileCheck2,
      permissoes: ["procedimentos-frequencia:emitir-nada-consta:seccional", "procedimentos-frequencia:emitir-nada-consta:global"],
    },
    {
      titulo: "Banco de horas",
      descricao: "Defina saldos, implantaÃ§Ã£o e transferÃªncias excepcionais.",
      href: hrefComOrgao("/administracao/banco-horas"),
      icon: Clock3,
      permissoes: ["banco-horas:gerenciar:seccional", "banco-horas:gerenciar:global"],
    },
    {
      titulo: "Horas extras",
      descricao: "Configure polÃ­ticas, responsÃ¡veis e fluxos de aprovaÃ§Ã£o.",
      href: "/administracao/horas-extras",
      icon: SlidersHorizontal,
      permissoes: ["horas-extras:configurar-politica:seccional", "horas-extras:configurar-workflow:seccional", "horas-extras:configurar-responsaveis:seccional", "horas-extras:configurar-politica:global", "horas-extras:configurar-workflow:global", "horas-extras:configurar-responsaveis:global"],
    },
    {
      titulo: "CalendÃ¡rio institucional",
      descricao: "Cadastre feriados, pontos facultativos e suspensÃµes.",
      href: "/administracao/calendario",
      icon: CalendarDays,
      permissoes: ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"],
    },
    {
      titulo: "Fusos horÃ¡rios",
      descricao: "Gerencie fusos usados por Ã³rgÃ£os, unidades e jornadas.",
      href: "/administracao/fusos-horarios",
      icon: Clock3,
      permissoes: ["fusos-horarios:gerenciar:global"],
    },
    {
      titulo: "FÃ©rias SARH",
      descricao: "Envie programaÃ§Ãµes aprovadas pela chefia ao SARH e confirme o retorno sincronizado.",
      href: "/administracao/ferias/integracao-sarh",
      icon: DatabaseZap,
      permissoes: [
        "programacao-ferias:executar-sarh:seccional",
        "programacao-ferias:executar-sarh:global",
      ],
    },
    {
      titulo: "Credenciais e integraÃ§Ãµes",
      descricao: "Configure SARH, Active Directory e relÃ³gios por seccional.",
      href: hrefComOrgao("/administracao/integracoes"),
      icon: KeyRound,
      permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Microsoft Teams",
      descricao: "Configure bot, abas, notificaÃ§Ãµes e manifesto do aplicativo Teams.",
      href: "/administracao/integracoes/teams",
      icon: MessageSquare,
      permissoes: ["integracoes-teams:visualizar:global", "integracoes-teams:configurar:global"],
    },
    {
      titulo: "SaÃºde dos workers",
      descricao: "Monitore filas, workers automÃ¡ticos e eventos de execuÃ§Ã£o.",
      href: "/administracao/workers",
      icon: ServerCog,
      permissoes: ["configuracoes:gerenciar:seccional", "integracoes:gerenciar:seccional", "configuracoes:gerenciar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Equipamentos biomÃ©tricos",
      descricao: "Cadastre relÃ³gios, REP, totens e dispositivos de marcaÃ§Ã£o.",
      href: hrefComOrgao("/equipamentos"),
      icon: Cpu,
      permissoes: ["integracoes:consultar:seccional", "integracoes:gerenciar:seccional", "integracoes:consultar:global", "integracoes:gerenciar:global"],
    },
    {
      titulo: "Auditoria",
      descricao: "Consulte trilhas, alteraÃ§Ãµes sensÃ­veis e dados antes/depois.",
      href: "/auditoria",
      icon: ShieldAlert,
      permissoes: ["auditoria:consultar:seccional", "auditoria:detalhar:seccional", "auditoria:consultar:global", "auditoria:detalhar:global"],
    },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "AdministraÃ§Ã£o" }]} />

      <PageHeader
        icon={Settings}
        titulo="AdministraÃ§Ã£o do SECP"
        descricao="ConfiguraÃ§Ãµes tÃ©cnicas, regras institucionais, permissÃµes, integraÃ§Ãµes e cadastros de apoio."
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
