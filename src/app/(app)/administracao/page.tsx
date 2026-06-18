import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Cpu,
  KeyRound,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function AdministracaoPage() {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");

  const cards = [
    {
      titulo: "Perfis e permissões",
      descricao: "Gerencie perfis, permissões e acessos por papel institucional.",
      href: "/perfis",
      icon: ShieldCheck,
    },
    {
      titulo: "Usuários",
      descricao: "Gerencie usuários internos, externos e contas técnicas.",
      href: "/usuarios",
      icon: UsersRound,
    },
    {
      titulo: "Órgãos",
      descricao: "Consulte órgãos institucionais usados por unidades e SARH.",
      href: "/orgaos",
      icon: Building2,
    },
    {
      titulo: "Unidades",
      descricao: "Gerencie a estrutura organizacional da JFAM.",
      href: "/unidades",
      icon: Building2,
    },
    {
      titulo: "Parametros",
      descricao: "Configure parametros gerais do controle eletrônico de ponto.",
      href: "/administracao/parametros",
      icon: Settings,
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
      descricao: "Configure integracoes futuras com SARH, SEI, LDAP e biometria.",
      href: "/administracao/integracoes",
      icon: KeyRound,
    },
    {
      titulo: "Equipamentos biométricos",
      descricao:
        "Cadastre relógios de ponto, REP, totens e dispositivos usados na importação AFD e nas marcações biometricas.",
      href: "/equipamentos",
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
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-900 group-hover:bg-blue-900 group-hover:text-white dark:bg-blue-950 dark:text-blue-200">
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
