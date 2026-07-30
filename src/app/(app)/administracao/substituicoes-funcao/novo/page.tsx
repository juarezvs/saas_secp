import { UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarSubstituicaoFuncaoAction } from "@/modules/substituicoes-funcao/presentation/actions/substituicoes-funcao.actions";
import { carregarDadosFormularioSubstituicaoFuncao } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form-data";
import { SubstituicaoFuncaoForm } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form";

export default async function NovaSubstituicaoFuncaoPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "substituicoes-funcao:gerenciar:seccional",
    "substituicoes-funcao:gerenciar:global",
  ]);
  const dados = await carregarDadosFormularioSubstituicaoFuncao();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Substituições de função",
            href: "/administracao/substituicoes-funcao",
          },
          { label: "Nova" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo="Nova substituição de função"
        descricao="Cadastre titular, substituto, período e ato administrativo para controle próprio do SECP."
      />

      <SubstituicaoFuncaoForm
        action={salvarSubstituicaoFuncaoAction}
        modo="novo"
        {...dados}
      />
    </div>
  );
}
