import { Activity, DatabaseZap, Search, ShieldAlert } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

export async function DashboardAuditor() {
  const [eventos, marcacoesBrutas, solicitacoes, integracoesComErro] =
    await Promise.all([
      prisma.auditoriaEvento.count(),
      prisma.marcacaoBruta.count(),
      prisma.solicitacao.count({
        where: { status: { in: ["ENVIADA", "EM_ANALISE"] } },
      }),
      prisma.integracaoSistema.count({ where: { status: "ERRO" } }),
    ]);

  return (
    <DashboardPerfilShell
      eyebrow="Auditoria"
      title="Dashboard do auditor"
      description="Monitore trilhas de auditoria, registros brutos, solicitações em curso e integracoes com erro."
      icon={Search}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardRoleCard
          titulo="Eventos auditados"
          valor={eventos}
          descricao="Total de eventos na trilha de auditoria."
          icon={Activity}
        />
        <DashboardRoleCard
          titulo="Marcações brutas"
          valor={marcacoesBrutas}
          descricao="Registros oficiais preservados como fonte bruta."
          icon={DatabaseZap}
        />
        <DashboardRoleCard
          titulo="Solicitações abertas"
          valor={solicitacoes}
          descricao="Pedidos ainda em análise ou enviados."
          icon={Search}
        />
        <DashboardRoleCard
          titulo="Integrações com erro"
          valor={integracoesComErro}
          descricao="Conectores exigindo verificacao técnica."
          icon={ShieldAlert}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardAtalho href="/auditoria" titulo="Auditoria" />
        <DashboardAtalho href="/marcacoes-brutas" titulo="Marcações brutas" />
        <DashboardAtalho href="/solicitacoes" titulo="Solicitações" />
        <DashboardAtalho
          href="/administracao/integracoes"
          titulo="Integrações"
        />
      </section>
    </DashboardPerfilShell>
  );
}
