import {
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Hourglass,
  type LucideIcon,
  UsersRound,
} from "lucide-react";

import {
  obterPermissoesDaSessao,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardFeatureCard } from "@/modules/dashboard/presentation/components/dashboard-feature-card";
import type { DashboardFeatureCardColor } from "@/modules/dashboard/presentation/components/dashboard-feature-card";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

const atalhos: Array<{
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  cor: DashboardFeatureCardColor;
  permissoes: string[];
}> = [
  {
    href: "/homologacao",
    titulo: "Homologar frequência",
    descricao:
      "Analise a competência mensal da equipe, confira pendências e conclua a homologação.",
    icon: ClipboardCheck,
    cor: "azul",
    permissoes: ["homologacao:gerenciar:chefia", "homologacao:gerenciar:global"],
  },
  {
    href: "/solicitacoes",
    titulo: "Analisar solicitações",
    descricao:
      "Delibere ajustes, abonos, compensações e demais pedidos enviados pela equipe.",
    icon: FileCheck2,
    cor: "verde",
    permissoes: ["solicitacoes:analisar:chefia", "solicitacoes:analisar:global"],
  },
  {
    href: "/boletim-frequencia",
    titulo: "Gerar boletim",
    descricao:
      "Emita e acompanhe boletins de frequência das unidades sob sua responsabilidade.",
    icon: FileCheck2,
    cor: "dourado",
    permissoes: [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:consultar:global",
    ],
  },
  {
    href: "/minha-equipe/ferias",
    titulo: "Férias da equipe",
    descricao: "Consulte afastamentos e programações de férias importadas do SARH.",
    icon: CalendarDays,
    cor: "azul-claro",
    permissoes: ["minha-equipe:consultar:chefia", "minha-equipe:consultar:global"],
  },
  {
    href: "/minha-equipe/presencas",
    titulo: "Presença da equipe",
    descricao: "Acompanhe a situação de presença e os registros recentes dos subordinados.",
    icon: UsersRound,
    cor: "verde-escuro",
    permissoes: ["minha-equipe:consultar:chefia", "minha-equipe:consultar:global"],
  },
  {
    href: "/banco-horas",
    titulo: "Banco de horas",
    descricao: "Consulte saldos, vencimentos, créditos e débitos do banco de horas da equipe.",
    icon: Hourglass,
    cor: "cinza",
    permissoes: ["banco-horas:consultar:chefia", "banco-horas:consultar:global"],
  },
];

export async function DashboardGestor() {
  const [permissao, fechamentosEmHomologacao, homologacoesPendentes, boletinsGerados] =
    await Promise.all([
      obterPermissoesDaSessao(),
      prisma.fechamentoMensalUnidade.count({
        where: { status: "EM_HOMOLOGACAO" },
      }),
      prisma.homologacaoServidorMes.count({
        where: { status: { in: ["PENDENTE", "COM_PENDENCIAS", "DEVOLVIDO"] } },
      }),
      prisma.boletimFrequencia.count({
        where: { status: { in: ["GERADO", "ENCAMINHADO_SECAP"] } },
      }),
    ]);
  const atalhosVisiveis = atalhos.filter((atalho) =>
    atalho.permissoes.some((permissaoAtalho) =>
      usuarioPossuiPermissaoNoPerfil(
        permissao.perfilAtivoCodigo,
        permissao.permissoes,
        permissaoAtalho,
      ),
    ),
  );

  return (
    <DashboardPerfilShell
      eyebrow="Painel da chefia"
      title="Dashboard do gestor"
      description="Acompanhe fechamentos mensais, pendências dos servidores e boletins que dependem de providências da chefia."
      icon={ClipboardCheck}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardRoleCard
          titulo="Fechamentos em homologação"
          valor={fechamentosEmHomologacao}
          descricao="Competências abertas para análise mensal pela chefia."
          icon={ClipboardCheck}
          cor="azul"
        />
        <DashboardRoleCard
          titulo="Servidores pendentes"
          valor={homologacoesPendentes}
          descricao="Homologações individuais com pendência, devolução ou análise."
          icon={UsersRound}
          cor="dourado"
        />
        <DashboardRoleCard
          titulo="Boletins gerados"
          valor={boletinsGerados}
          descricao="Boletins aguardando encaminhamento ou conferência."
          icon={FileCheck2}
          cor="verde"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {atalhosVisiveis.map((atalho) => (
          <DashboardFeatureCard
            key={atalho.href}
            href={atalho.href}
            titulo={atalho.titulo}
            descricao={atalho.descricao}
            icon={atalho.icon}
            cor={atalho.cor}
          />
        ))}
      </section>
    </DashboardPerfilShell>
  );
}
