import { Landmark } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorariosAtivos } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import { criarOrgaoAction } from "@/modules/orgaos/application/actions/salvar-orgao.action";
import { OrgaoForm } from "@/modules/orgaos/presentation/components/orgao-form";

export default async function NovoOrgaoPage() {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");
  const fusosHorarios = await listarFusosHorariosAtivos();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Órgãos", href: "/orgaos" },
          { label: "Novo" },
        ]}
      />

      <PageHeader
        icon={Landmark}
        titulo="Novo orgao"
        descricao="Cadastre um orgao institucional para uso em unidades, servidores e integracoes."
      />

      <OrgaoForm
        action={criarOrgaoAction}
        modo="criar"
        fusosHorarios={fusosHorarios}
      />
    </div>
  );
}
