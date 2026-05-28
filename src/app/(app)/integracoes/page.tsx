import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarEquipamentosBiometricos,
  listarIntegracoesSistema,
  listarLogsIntegracao,
  listarUnidadesParaEquipamentos,
} from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { IntegracoesStatusCard } from "@/modules/integracoes/presentation/components/integracoes-status-card";
import { SincronizacaoSarhCard } from "@/modules/integracoes/presentation/components/sincronizacao-sarh-card";
import { EquipamentoBiometricoForm } from "@/modules/integracoes/presentation/components/equipamento-biometrico-form";
import { EquipamentosBiometricosTable } from "@/modules/integracoes/presentation/components/equipamentos-biometricos-table";
import { LogsIntegracaoTable } from "@/modules/integracoes/presentation/components/logs-integracao-table";

export default async function IntegracoesPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
  ]);

  const [integracoes, equipamentos, logs, unidades] = await Promise.all([
    listarIntegracoesSistema(),
    listarEquipamentosBiometricos(),
    listarLogsIntegracao({ limite: 50 }),
    listarUnidadesParaEquipamentos(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Integrações" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Integrações
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Sistemas externos e equipamentos
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Gerencie integrações com SARH, equipamentos biométricos, webhooks e
          futuras integrações com SEI, LDAP e outros sistemas institucionais.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 6º e 8º"
        titulo="Equipamento biométrico integrado ao sistema"
        descricao="A frequência deve ser registrada por equipamento biométrico integrado ao sistema de controle eletrônico, admitindo meio alternativo idôneo quando houver impossibilidade de identificação biométrica."
      />

      <IntegracoesStatusCard integracoes={integracoes} />

      <SincronizacaoSarhCard />

      <EquipamentoBiometricoForm unidades={unidades} />

      <EquipamentosBiometricosTable equipamentos={equipamentos} />

      <LogsIntegracaoTable logs={logs} />
    </div>
  );
}
