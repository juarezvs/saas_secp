import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Clock3,
  Cpu,
  FileCheck2,
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
  "configuracoes:gerenciar:global",
  "banco-horas:gerenciar:global",
  "integracoes:teams:visualizar",
  "menus:personalizar:global",
];

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

  const cards = [
    {
      titulo: "Liberação de Rotinas",
      descricao:
        "Controle quais rotinas ficam disponíveis para uso, mesmo quando já constam nos perfis.",
      href: "/administracao/liberacao-rotinas",
      icon: ToggleLeft,
    },
    {
      titulo: "Personalizar Menu",
      descricao:
        "Configure grupos, opcoes e ordem do menu lateral por perfil.",
      href: "/administracao/personalizar-menu",
      icon: Palette,
      permissao: "menus:personalizar:global",
    },
    {
      titulo: "Perfis e permissões",
      descricao:
        "Gerencie perfis, permissões e acessos por papel institucional.",
      href: "/perfis",
      icon: ShieldCheck,
    },
    {
      titulo: "Usuários",
      descricao: "Gerencie usuários internos, externos e contas técnicas.",
      href: hrefComOrgao("/usuarios"),
      icon: UsersRound,
    },
    {
      titulo: "Órgãos",
      descricao: "Consulte órgãos institucionais usados por unidades e SARH.",
      href: hrefComOrgao("/orgaos"),
      icon: Building2,
    },
    {
      titulo: "Unidades",
      descricao: "Gerencie a estrutura organizacional da JFAM.",
      href: hrefComOrgao("/unidades"),
      icon: Building2,
    },
    {
      titulo: "Servidores",
      descricao:
        "Gerencie servidores, vínculos funcionais, usuários relacionados e lotações.",
      href: hrefComOrgao("/servidores"),
      icon: Users,
    },
    {
      titulo: "Chefias",
      descricao:
        "Gerencie gestores, substitutos, delegações e responsáveis por unidades.",
      href: hrefComOrgao("/chefias"),
      icon: Network,
    },
    {
      titulo: "Jornadas",
      descricao:
        "Cadastre jornadas, escalas e atribuições aplicáveis aos servidores.",
      href: hrefComOrgao("/jornadas"),
      icon: CalendarClock,
    },
    {
      titulo: "AFD",
      descricao:
        "Importe arquivos AFD de equipamentos biométricos e acompanhe o processamento.",
      href: "/afd",
      icon: Upload,
    },
    {
      titulo: "Apuração",
      descricao:
        "Consulte e recalcule apurações diárias e mensais de frequência.",
      href: hrefComOrgao("/apuracao"),
      icon: FileCheck2,
    },
    {
      titulo: "Regulamentação do ponto",
      descricao:
        "Customize limites, prazos, tolerâncias e regras de crédito do ponto por órgão.",
      href: hrefComOrgao("/administracao/regulamentacao-ponto"),
      icon: SlidersHorizontal,
      permissao: "regulamentacao-ponto:gerenciar:global",
    },
    {
      titulo: "Gerenciar banco de horas",
      descricao:
        "Defina competência inicial, saldos de implantação e transferências excepcionais por servidor.",
      href: hrefComOrgao("/administracao/banco-horas"),
      icon: Clock3,
      permissao: "banco-horas:gerenciar:global",
    },
    {
      titulo: "Calendário institucional",
      descricao:
        "Cadastre feriados, pontos facultativos e suspensões que impactam prazos e a apuração do ponto.",
      href: "/administracao/calendario",
      icon: CalendarDays,
    },
    {
      titulo: "Credenciais e integracoes",
      descricao: "Configure SARH, Active Directory e relógios por seccional.",
      href: hrefComOrgao("/administracao/integracoes"),
      icon: KeyRound,
    },
    {
      titulo: "Saúde dos Workers",
      descricao:
        "Monitore filas, workers automáticos, rotinas assíncronas e últimos eventos de execução.",
      href: "/administracao/integracoes/teams",
      icon: MessageSquare,
      permissao: "integracoes:teams:visualizar",
    },
    {
      titulo: "Microsoft Teams",
      descricao:
        "Configure bot, abas, notificações individuais, Adaptive Cards e manifesto do aplicativo Teams.",
      href: "/administracao/workers",
      icon: ServerCog,
      permissao: "configuracoes:gerenciar:global",
    },
    {
      titulo: "Equipamentos biométricos",
      descricao:
        "Cadastre relógios de ponto, REP, totens e dispositivos usados na importação AFD e nas marcações biometricas.",
      href: hrefComOrgao("/equipamentos"),
      icon: Cpu,
    },
    {
      titulo: "Auditoria",
      descricao:
        "Consulte trilhas de auditoria, alteracoes sensíveis, usuários responsáveis e dados antes/depois.",
      href: "/auditoria",
      icon: ShieldAlert,
      permissao: "auditoria:consultar:global",
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Administração" }]} />

      <PageHeader
        icon={Settings}
        titulo="Configurações institucionais do SECP"
        descricao="Area reservada para administração técnica, parametros do sistema, perfis, permissões, usuários, unidades e integracoes."
        artigo="Art. 20, inciso I"
        regraTitulo="Responsabilidade técnica do NUTEC"
        regraDescricao="O NUTEC é responsável por gerenciar o sistema de controle eletrônico de frequência quanto ao cadastro e alteração de usuários e por dirimir dúvidas sobre funcionamento e registros."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards
          .filter((card) => {
            const permissaoCard =
              card.permissao ?? "configuracoes:gerenciar:global";

            return usuarioPossuiPermissaoNoPerfil(
              permissao.perfilAtivoCodigo,
              permissao.permissoes,
              permissaoCard,
            );
          })
          .map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex gap-4">
                  <div className="secp-theme-icon flex size-12 shrink-0 items-center justify-center rounded-xl group-hover:bg-secp-blue-900 group-hover:text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </div>

                  <div>
                    <h2 className="font-bold">{card.titulo}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {card.descricao}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
      </section>
    </div>
  );
}
