import Link from "next/link";
import {
  Building2,
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
      titulo: "Perfis e permissoes",
      descricao: "Gerencie perfis, permissoes e acessos por papel institucional.",
      href: "/perfis",
      icon: ShieldCheck,
    },
    {
      titulo: "Usuarios",
      descricao: "Gerencie usuarios internos, externos e contas tecnicas.",
      href: "/usuarios",
      icon: UsersRound,
    },
    {
      titulo: "Orgaos",
      descricao: "Consulte orgaos institucionais usados por unidades e SARH.",
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
      descricao: "Configure parametros gerais do controle eletronico de ponto.",
      href: "/administracao/parametros",
      icon: Settings,
    },
    {
      titulo: "Credenciais e integracoes",
      descricao: "Configure integracoes futuras com SARH, SEI, LDAP e biometria.",
      href: "/administracao/integracoes",
      icon: KeyRound,
    },
    {
      titulo: "Equipamentos biometricos",
      descricao:
        "Cadastre relogios de ponto, REP, totens e dispositivos usados na importacao AFD e nas marcacoes biometricas.",
      href: "/equipamentos",
      icon: Cpu,
    },
    {
      titulo: "Auditoria",
      descricao:
        "Consulte trilhas de auditoria, alteracoes sensiveis, usuarios responsaveis e dados antes/depois.",
      href: "/auditoria",
      icon: ShieldAlert,
      permissao: "auditoria:consultar:global",
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Administracao" }]} />

      <PageHeader
        icon={Settings}
        titulo="Configuracoes institucionais do SECP"
        descricao="Area reservada para administracao tecnica, parametros do sistema, perfis, permissoes, usuarios, unidades e integracoes."
        artigo="Art. 20, inciso I"
        regraTitulo="Responsabilidade tecnica do NUTEC"
        regraDescricao="O NUTEC e responsavel por gerenciar o sistema de controle eletronico de frequencia quanto ao cadastro e alteracao de usuarios e por dirimir duvidas sobre funcionamento e registros."
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
