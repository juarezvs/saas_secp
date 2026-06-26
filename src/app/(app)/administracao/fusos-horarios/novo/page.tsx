import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarFusoHorarioAction } from "@/modules/fusos-horarios/application/actions/salvar-fuso-horario.action";
import { FusoHorarioForm } from "@/modules/fusos-horarios/presentation/components/fuso-horario-form";

export default async function NovoFusoHorarioPage() {
  await exigirPermissaoOuRedirecionar("fusos-horarios:gerenciar:global");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Fusos horarios", href: "/administracao/fusos-horarios" },
          { label: "Novo" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Novo fuso horario"
        descricao="Cadastre um fuso IANA para uso em orgaos e unidades."
      />

      <FusoHorarioForm action={criarFusoHorarioAction} modo="criar" />
    </div>
  );
}
