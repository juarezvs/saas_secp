import { Building2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorariosAtivos } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import { criarUnidadeAction } from "@/modules/unidades/application/actions/criar-unidade.action";
import {
  listarOrgaosAtivos,
  listarUnidadesParaSelecao,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadeForm } from "@/modules/unidades/presentation/components/unidade-form";

export default async function NovaUnidadePage() {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];

  const [orgaos, unidades, fusosHorarios] = await Promise.all([
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
    listarUnidadesParaSelecao({ orgaoIdsPermitidos }),
    listarFusosHorariosAtivos(),
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
        fusosHorarios={fusosHorarios}
        modo="criar"
        valoresIniciais={{
          ativo: true,
        }}
      />
    </div>
  );
}
