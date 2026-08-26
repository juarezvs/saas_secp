import { ShieldAlert } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { criarPerfilAction } from "@/modules/perfis/application/actions/criar-perfil.action";
import {
  listarPerfisParaFiltro,
  listarPermissoesOrdenadas,
} from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { PerfilForm } from "@/modules/perfis/presentation/components/perfil-form";

export default async function NovoPerfilPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;

  const [permissoes, perfisDestinoExcecao, orgaosPermitidos] = await Promise.all([
    listarPermissoesOrdenadas(),
    listarPerfisParaFiltro({ orgaoIdsPermitidos }),
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Perfis e permissões", href: "/perfis" },
          { label: "Novo perfil" },
        ]}
      />

      <PageHeader
        icon={ShieldAlert}
        titulo="Novo perfil"
        descricao="Crie um perfil institucional e associe permissões de acordo com as responsabilidades do usuário no SECP."
        artigo="Modelo RBAC do SECP"
        regraTitulo="Perfis customizados"
        regraDescricao="O SECP permite criar perfis personalizados para refletir responsabilidades institucionais, administrativas, técnicas, gerenciais e de consulta."
      />

      <PerfilForm
        action={criarPerfilAction}
        permissoes={permissoes}
        perfisDestinoExcecao={perfisDestinoExcecao}
        orgaosPermitidos={orgaosPermitidos}
        permitirPerfilGlobal={escopoOrgao.global}
        modo="criar"
        valoresIniciais={{
          ativo: true,
          administrativo: false,
          excecao: false,
          global: false,
          perfilDestinoExcecaoId: null,
          permissoes: [],
        }}
      />
    </div>
  );
}
