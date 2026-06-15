import { CalendarRange } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarRecessoForenseAction } from "@/modules/recesso-forense/application/actions/recesso-forense.actions";
import { RecessoForenseForm } from "@/modules/recesso-forense/presentation/components/recesso-forense-form";

export default async function NovoRecessoForensePage() {
  await exigirPermissaoOuRedirecionar("recesso:gerenciar:global");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: "Novo recesso" },
        ]}
      />

      <PageHeader
        icon={CalendarRange}
        titulo="Novo recesso"
        descricao="Cadastre o período anual próprio do recesso. O sistema fixa o intervalo normativo de 20/12 a 06/01."
        artigo="Recesso forense"
        regraTitulo="Período anual 20/12 a 06/01"
        regraDescricao="O recesso deve ser tratado em módulo próprio, com convocações, escolhas, homologação e fechamento separados do ponto ordinário."
      />

      <RecessoForenseForm action={criarRecessoForenseAction} />
    </div>
  );
}
