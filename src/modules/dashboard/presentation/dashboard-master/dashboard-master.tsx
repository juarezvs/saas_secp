import { Activity, DatabaseZap, Network, ShieldCheck } from "lucide-react";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardFeatureCard } from "@/modules/dashboard/presentation/components/dashboard-feature-card";
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
      description="Visão ampla de governança, cadastros, integrações, auditoria e saúde operacional do SECP."
      icon={ShieldCheck}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardRoleCard
          titulo="Usuários"
          valor={usuarios}
          descricao="Contas cadastradas no sistema."
          icon={ShieldCheck}
          cor="azul"
        />
        <DashboardRoleCard
          titulo="Integrações"
          valor={integracoes}
          descricao="Conectores institucionais registrados."
          icon={Network}
          cor="verde"
        />
        <DashboardRoleCard
          titulo="Auditoria"
          valor={eventosAuditoria}
          descricao="Eventos auditáveis acumulados."
          icon={Activity}
          cor="dourado"
        />
        <DashboardRoleCard
          titulo="Marcações pendentes"
          valor={marcacoesPendentes}
          descricao="Registros brutos ainda não processados."
          icon={DatabaseZap}
          cor="azul-claro"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardFeatureCard
          href="/administracao"
          titulo="Administração"
          descricao="Acesse as rotinas administrativas centrais do sistema."
          icon={ShieldCheck}
          cor="azul"
        />
        <DashboardFeatureCard
          href="/administracao/integracoes"
          titulo="Integrações"
          descricao="Gerencie conectores, parâmetros e sincronizações institucionais."
          icon={Network}
          cor="verde"
        />
        <DashboardFeatureCard
          href="/auditoria"
          titulo="Auditoria"
          descricao="Consulte eventos auditáveis e acompanhe rastros operacionais."
          icon={Activity}
          cor="dourado"
        />
        <DashboardFeatureCard
          href="/marcacoes-brutas"
          titulo="Marcações brutas"
          descricao="Pesquise registros capturados e pendências de processamento."
          icon={DatabaseZap}
          cor="azul-claro"
        />
      </section>
    </DashboardPerfilShell>
  );
}
