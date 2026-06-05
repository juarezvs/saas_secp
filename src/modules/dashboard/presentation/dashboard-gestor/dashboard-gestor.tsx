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
      description="Acompanhe fechamentos mensais, pendencias dos servidores e boletins que dependem de providencias da chefia."
      icon={ClipboardCheck}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardRoleCard
          titulo="Fechamentos em homologacao"
          valor={fechamentosEmHomologacao}
          descricao="Competencias abertas para analise mensal pela chefia."
          icon={ClipboardCheck}
        />
        <DashboardRoleCard
          titulo="Servidores pendentes"
          valor={homologacoesPendentes}
          descricao="Homologacoes individuais com pendencia, devolucao ou analise."
          icon={UsersRound}
        />
        <DashboardRoleCard
          titulo="Boletins gerados"
          valor={boletinsGerados}
          descricao="Boletins aguardando encaminhamento ou conferencia."
          icon={FileCheck2}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardAtalho href="/homologacao" titulo="Homologar frequencia" />
        <DashboardAtalho href="/solicitacoes" titulo="Analisar solicitacoes" />
        <DashboardAtalho href="/boletim-frequencia" titulo="Gerar boletim" />
      </section>
    </DashboardPerfilShell>
  );
}
