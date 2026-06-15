import { Activity, DatabaseZap, Network, ShieldCheck } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

export async function DashboardMaster() {
  const [usuarios, integracoes, eventosAuditoria, marcacoesPendentes] =
    await Promise.all([
      prisma.usuario.count(),
      prisma.integracaoSistema.count(),
      prisma.auditoriaEvento.count(),
      prisma.marcacaoBruta.count({ where: { processada: false } }),
    ]);

  return (
    <DashboardPerfilShell
      eyebrow="Administração master"
      title="Dashboard master"
      description="Visão ampla de governança, cadastros, integracoes, auditoria e saúde operacional do SECP."
      icon={ShieldCheck}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardRoleCard
          titulo="Usuários"
          valor={usuarios}
          descricao="Contas cadastradas no sistema."
          icon={ShieldCheck}
        />
        <DashboardRoleCard
          titulo="Integrações"
          valor={integracoes}
          descricao="Conectores institucionais registrados."
          icon={Network}
        />
        <DashboardRoleCard
          titulo="Auditoria"
          valor={eventosAuditoria}
          descricao="Eventos auditáveis acumulados."
          icon={Activity}
        />
        <DashboardRoleCard
          titulo="Marcações pendentes"
          valor={marcacoesPendentes}
          descricao="Registros brutos ainda não processados."
          icon={DatabaseZap}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardAtalho href="/administracao" titulo="Administração" />
        <DashboardAtalho href="/integracoes" titulo="Integrações" />
        <DashboardAtalho href="/auditoria" titulo="Auditoria" />
        <DashboardAtalho href="/marcacoes-brutas" titulo="Marcações brutas" />
      </section>
    </DashboardPerfilShell>
  );
}
