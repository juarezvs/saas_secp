import { Building2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarUnidadeAction } from "@/modules/unidades/application/actions/criar-unidade.action";
import {
  listarOrgaosAtivos,
  listarUnidadesParaSelecao,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadeForm } from "@/modules/unidades/presentation/components/unidade-form";

export default async function NovaUnidadePage() {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const [orgaos, unidades] = await Promise.all([
    listarOrgaosAtivos(),
    listarUnidadesParaSelecao(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Unidades", href: "/unidades" },
          { label: "Nova unidade" },
        ]}
      />

      <PageHeader
        icon={Building2}
        titulo="Nova unidade organizacional"
        descricao="Cadastre unidades administrativas, judiciais, núcleos, seções, subseções, varas, gabinetes e demais estruturas necessárias ao SECP."
        artigo="Art. 20, inciso I"
        regraTitulo="Gestão técnica pelo NUTEC"
        regraDescricao="A estrutura organizacional será usada pelo sistema para controle de usuários, lotações, chefias, relatórios e demais ações gerenciais do controle de frequência."
      />

      <UnidadeForm
        action={criarUnidadeAction}
        orgaos={orgaos}
        unidades={unidades}
        modo="criar"
        valoresIniciais={{
          ativo: true,
        }}
      />
    </div>
  );
}
