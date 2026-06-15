import { ClipboardCheck, FileCheck2, UsersRound } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

export async function DashboardGestor() {
  const [fechamentosEmHomologacao, homologacoesPendentes, boletinsGerados] =
    await Promise.all([
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
          descricao="Competencias abertas para análise mensal pela chefia."
          icon={ClipboardCheck}
        />
        <DashboardRoleCard
          titulo="Servidores pendentes"
          valor={homologacoesPendentes}
          descricao="Homologações individuais com pendência, devolucao ou análise."
          icon={UsersRound}
        />
        <DashboardRoleCard
          titulo="Boletins gerados"
          valor={boletinsGerados}
          descricao="Boletins aguardando encaminhamento ou conferência."
          icon={FileCheck2}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardAtalho href="/homologacao" titulo="Homologar frequência" />
        <DashboardAtalho href="/solicitacoes" titulo="Analisar solicitações" />
        <DashboardAtalho href="/boletim-frequencia" titulo="Gerar boletim" />
      </section>
    </DashboardPerfilShell>
  );
}
