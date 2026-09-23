import { UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarSubstituicaoFuncaoAction } from "@/modules/substituicoes-funcao/presentation/actions/substituicoes-funcao.actions";
import { carregarDadosFormularioSubstituicaoFuncao } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form-data";
import { SubstituicaoFuncaoForm } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form";

type NovaSubstituicaoFuncaoPageProps = {
  searchParams?: Promise<{
    tipo?: string;
  }>;
};

export default async function NovaSubstituicaoFuncaoPage({
  searchParams,
}: NovaSubstituicaoFuncaoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "substituicoes-funcao:gerenciar:seccional",
    "substituicoes-funcao:gerenciar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const cadastroAutomatico = params.tipo === "AUTOMATICA";
  const dados = await carregarDadosFormularioSubstituicaoFuncao();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          {
            label: cadastroAutomatico
              ? "Cadastro de substituicao automatica"
              : "Substituicoes de funcao",
            href: cadastroAutomatico
              ? "/administracao/substituicoes-funcao?tipo=AUTOMATICA"
              : "/administracao/substituicoes-funcao",
          },
          { label: "Nova" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo={
          cadastroAutomatico
            ? "Novo cadastro de substituicao automatica"
            : "Nova substituicao de funcao"
        }
        descricao={
          cadastroAutomatico
            ? "Cadastre quem responde automaticamente pela unidade quando o titular estiver afastado."
            : "Cadastre titular, substituto, periodo e ato administrativo para controle proprio do SECP."
        }
      />

      <SubstituicaoFuncaoForm
        action={salvarSubstituicaoFuncaoAction}
        modo="novo"
        valores={cadastroAutomatico ? { tipo: "AUTOMATICA" } : undefined}
        {...dados}
      />
    </div>
  );
}
