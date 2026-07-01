import { Clock3 } from "lucide-react";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarFusoHorarioAction } from "@/modules/fusos-horarios/application/actions/salvar-fuso-horario.action";
import { FusoHorarioForm } from "@/modules/fusos-horarios/presentation/components/fuso-horario-form";

export default async function NovoFusoHorarioPage() {
  await exigirPermissaoOuRedirecionar("fusos-horarios:gerenciar:global");
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  if (!escopoOrgao.global) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Fusos horários", href: "/administracao/fusos-horarios" },
          { label: "Novo" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Novo fuso horário"
        descricao="Cadastre um identificador IANA. Esse valor será usado tecnicamente nos cálculos e visualizações do SECP."
      />

      <FusoHorarioForm action={criarFusoHorarioAction} modo="criar" />
    </div>
  );
}
