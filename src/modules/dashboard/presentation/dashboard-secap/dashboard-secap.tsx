import { FileCheck2, Send, ShieldCheck } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";

export async function DashboardSecap() {
  const [encaminhados, recebidos, conferidos] = await Promise.all([
    prisma.boletimFrequencia.count({ where: { status: "ENCAMINHADO_SECAP" } }),
    prisma.boletimFrequencia.count({ where: { status: "RECEBIDO_SECAP" } }),
    prisma.boletimFrequencia.count({ where: { status: "CONFERIDO" } }),
  ]);

  return (
    <DashboardPerfilShell
      eyebrow="SECAP / NUCGP"
      title="Dashboard SECAP"
      description="Acompanhe boletins encaminhados, recebidos e conferidos para providencias administrativas de pessoal."
      icon={FileCheck2}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardRoleCard
          titulo="Encaminhados"
          valor={encaminhados}
          descricao="Boletins enviados para conferencia SECAP/NUCGP."
          icon={Send}
        />
        <DashboardRoleCard
          titulo="Recebidos"
          valor={recebidos}
          descricao="Boletins recebidos e aguardando conferencia final."
          icon={FileCheck2}
        />
        <DashboardRoleCard
          titulo="Conferidos"
          valor={conferidos}
          descricao="Boletins ja conferidos administrativamente."
          icon={ShieldCheck}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardAtalho href="/boletim-frequencia" titulo="Conferir boletins" />
        <DashboardAtalho href="/relatorios" titulo="Relatorios" />
        <DashboardAtalho href="/servidores" titulo="Servidores" />
      </section>
    </DashboardPerfilShell>
  );
}
