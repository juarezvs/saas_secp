import { Building2, ClipboardCheck, FileCheck2, Scale } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

export async function DashboardDiref() {
  const [unidades, homologados, pendentes, boletinsEncaminhados] =
    await Promise.all([
      prisma.unidadeOrganizacional.count({ where: { ativo: true } }),
      prisma.fechamentoMensalUnidade.count({ where: { status: "HOMOLOGADO" } }),
      prisma.fechamentoMensalUnidade.count({
        where: { status: { in: ["ABERTO", "EM_HOMOLOGACAO", "HOMOLOGADO_PARCIAL"] } },
      }),
      prisma.boletimFrequencia.count({ where: { status: "ENCAMINHADO_SECAP" } }),
    ]);

  return (
    <DashboardPerfilShell
      eyebrow="Direção do foro"
      title="Dashboard DIREF"
      description="Visão gerencial da abrangência institucional, homologações e boletins de frequência."
      icon={Scale}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardRoleCard
          titulo="Unidades ativas"
          valor={unidades}
          descricao="Estrutura institucional em operacao no SECP."
          icon={Building2}
        />
        <DashboardRoleCard
          titulo="Fechamentos homologados"
          valor={homologados}
          descricao="Competencias já homologadas pelas chefias."
          icon={ClipboardCheck}
        />
        <DashboardRoleCard
          titulo="Pendências de homologação"
          valor={pendentes}
          descricao="Fechamentos ainda abertos, em homologação ou parciais."
          icon={ClipboardCheck}
        />
        <DashboardRoleCard
          titulo="Boletins encaminhados"
          valor={boletinsEncaminhados}
          descricao="Boletins enviados a SECAP/NUCGP."
          icon={FileCheck2}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardAtalho href="/homologacao" titulo="Homologação" />
        <DashboardAtalho href="/boletim-frequencia" titulo="Boletins" />
        <DashboardAtalho href="/unidades" titulo="Unidades" />
        <DashboardAtalho href="/relatorios" titulo="Relatórios" />
      </section>
    </DashboardPerfilShell>
  );
}
