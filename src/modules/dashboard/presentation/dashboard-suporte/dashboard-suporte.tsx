import {
  Activity,
  DatabaseZap,
  HardDriveUpload,
  HeartPulse,
  Network,
  ShieldAlert,
} from "lucide-react";

import { DashboardAtalho } from "@/modules/dashboard/presentation/components/dashboard-atalho";
import { DashboardPerfilShell } from "@/modules/dashboard/presentation/components/dashboard-perfil-shell";
import { DashboardRoleCard } from "@/modules/dashboard/presentation/components/dashboard-role-card";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

export async function DashboardSuporte() {
  const [
    integracoesComErro,
    logsIntegracaoPendentes,
    importacoesAfdAbertas,
    marcacoesBrutasPendentes,
    execucoesSarhProblematicas,
    sessoesFaciaisProblematicas,
  ] = await Promise.all([
    prismaListagem.integracaoSistema.count({ where: { status: "ERRO" } }),
    prismaListagem.logIntegracao.count({
      where: { status: { in: ["ERRO", "PENDENTE"] } },
    }),
    prismaListagem.importacaoAfd.count({
      where: { status: { in: ["RECEBIDA", "EM_PROCESSAMENTO", "ERRO"] } },
    }),
    prismaListagem.marcacaoBruta.count({ where: { processada: false } }),
    prismaListagem.integracaoSarhExecucao.count({
      where: { status: { in: ["CONCLUIDA_COM_ERROS", "FALHOU"] } },
    }),
    prismaListagem.sessaoCadastroFacial.count({
      where: { status: { in: ["EXPIRADA", "REPROVADA", "CANCELADA"] } },
    }),
  ]);

  return (
    <DashboardPerfilShell
      eyebrow="Suporte técnico"
      title="Dashboard suporte"
      description="Painel operacional para acompanhar integrações, importações, filas de processamento e pontos de atenção técnica do SECP."
      icon={HeartPulse}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardRoleCard
          titulo="Integrações com erro"
          valor={integracoesComErro}
          descricao="Conectores institucionais marcados com falha."
          icon={ShieldAlert}
        />
        <DashboardRoleCard
          titulo="Logs pendentes/erro"
          valor={logsIntegracaoPendentes}
          descricao="Eventos de integração que exigem verificação."
          icon={Network}
        />
        <DashboardRoleCard
          titulo="Importações AFD abertas"
          valor={importacoesAfdAbertas}
          descricao="Lotes recebidos, em processamento ou com erro."
          icon={HardDriveUpload}
        />
        <DashboardRoleCard
          titulo="Marcações pendentes"
          valor={marcacoesBrutasPendentes}
          descricao="Registros brutos ainda não processados."
          icon={DatabaseZap}
        />
        <DashboardRoleCard
          titulo="Execuções SARH com falha"
          valor={execucoesSarhProblematicas}
          descricao="Sincronizações concluídas com erros ou falhadas."
          icon={Activity}
        />
        <DashboardRoleCard
          titulo="Sessões faciais problemáticas"
          valor={sessoesFaciaisProblematicas}
          descricao="Cadastros faciais expirados, reprovados ou cancelados."
          icon={HeartPulse}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <DashboardAtalho href="/administracao" titulo="Administração" />
        <DashboardAtalho
          href="/administracao/integracoes"
          titulo="Integrações"
        />
        <DashboardAtalho href="/administracao/integracoes/sarh" titulo="SARH" />
        <DashboardAtalho href="/afd" titulo="Importações AFD" />
        <DashboardAtalho href="/marcacoes-brutas" titulo="Marcações brutas" />
        <DashboardAtalho href="/auditoria" titulo="Auditoria" />
      </section>
    </DashboardPerfilShell>
  );
}
