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
      eyebrow="Administracao master"
      title="Dashboard master"
      description="Visao ampla de governanca, cadastros, integracoes, auditoria e saude operacional do SECP."
      icon={ShieldCheck}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardRoleCard
          titulo="Usuarios"
          valor={usuarios}
          descricao="Contas cadastradas no sistema."
          icon={ShieldCheck}
        />
        <DashboardRoleCard
          titulo="Integracoes"
          valor={integracoes}
          descricao="Conectores institucionais registrados."
          icon={Network}
        />
        <DashboardRoleCard
          titulo="Auditoria"
          valor={eventosAuditoria}
          descricao="Eventos auditaveis acumulados."
          icon={Activity}
        />
        <DashboardRoleCard
          titulo="Marcacoes pendentes"
          valor={marcacoesPendentes}
          descricao="Registros brutos ainda nao processados."
          icon={DatabaseZap}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardAtalho href="/administracao" titulo="Administracao" />
        <DashboardAtalho href="/integracoes" titulo="Integracoes" />
        <DashboardAtalho href="/auditoria" titulo="Auditoria" />
        <DashboardAtalho href="/marcacoes-brutas" titulo="Marcacoes brutas" />
      </section>
    </DashboardPerfilShell>
  );
}
