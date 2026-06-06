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
          { label: "Administracao", href: "/administracao" },
          { label: "Equipamentos biometricos" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Equipamentos biometricos"
        descricao="Cadastre relogios de ponto, REP, totens e dispositivos biometricos usados para receber marcacoes oficiais e importar arquivos AFD."
        artigo="Controle de frequencia"
        regraTitulo="Equipamento, AFD e rastreabilidade"
        regraDescricao="Ao importar AFD, o SECP tenta associar o arquivo ao equipamento cadastrado pelo codigo ou numero de serie, preservando a origem da marcacao."
      />

      <EquipamentoBiometricoForm unidades={unidades} />
      <EquipamentosBiometricosTable equipamentos={equipamentos} />
    </div>
  );
}
