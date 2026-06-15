import { Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarEquipamentosBiometricos,
  listarUnidadesParaEquipamentos,
} from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentoBiometricoForm } from "@/modules/integracoes/presentation/components/equipamento-biometrico-form";
import { EquipamentosBiometricosTable } from "@/modules/integracoes/presentation/components/equipamentos-biometricos-table";

export default async function EquipamentosPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
    "afd:importar:global",
  ]);

  const [equipamentos, unidades] = await Promise.all([
    listarEquipamentosBiometricos(),
    listarUnidadesParaEquipamentos(),
  ]);

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

      <EquipamentoBiometricoForm unidades={unidades} />
      <EquipamentosBiometricosTable equipamentos={equipamentos} />
    </div>
  );
}
