import { Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarColetasRelogioProgressivasAtivas } from "@/modules/integracoes/application/jobs/coleta-relogio-progressiva.jobs";
import { obterStatusHenryOnlineWorker } from "@/modules/integracoes/application/workers/henry-online-worker-runtime";
import { listarEquipamentosBiometricos } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentosPageTabs } from "@/modules/integracoes/presentation/components/equipamentos-page-tabs";

export default async function EquipamentosPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
    "afd:importar:global",
  ]);

  const [equipamentos, coletasAtivas] = await Promise.all([
    listarEquipamentosBiometricos(),
    listarColetasRelogioProgressivasAtivas(),
  ]);
  const statusListenerOnline = obterStatusHenryOnlineWorker();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Equipamentos biométricos" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Equipamentos biométricos"
        descricao="Cadastre relógios de ponto, REP, totens e dispositivos biométricos usados para receber marcações oficiais e importar arquivos AFD."
        artigo="Controle de frequência"
        regraTitulo="Equipamento, AFD e rastreabilidade"
        regraDescricao="Ao importar AFD, o SECP tenta associar o arquivo ao equipamento cadastrado pelo código ou número de série, preservando a origem da marcação."
      />

      <EquipamentosPageTabs
        equipamentos={equipamentos}
        coletasAtivas={coletasAtivas}
        statusListenerOnline={statusListenerOnline}
      />
    </div>
  );
}
