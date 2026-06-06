import { ShieldAlert } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarPerfilAction } from "@/modules/perfis/application/actions/criar-perfil.action";
import { listarPermissoesOrdenadas } from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { PerfilForm } from "@/modules/perfis/presentation/components/perfil-form";

export default async function NovoPerfilPage() {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const permissoes = await listarPermissoesOrdenadas();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Perfis e permissoes", href: "/perfis" },
          { label: "Novo perfil" },
        ]}
      />

      <PageHeader
        icon={ShieldAlert}
        titulo="Novo perfil"
        descricao="Crie um perfil institucional e associe permissoes de acordo com as responsabilidades do usuario no SECP."
        artigo="Modelo RBAC do SECP"
        regraTitulo="Perfis customizados"
        regraDescricao="O SECP permite criar perfis personalizados para refletir responsabilidades institucionais, administrativas, tecnicas, gerenciais e de consulta."
      />

      <PerfilForm
        action={criarPerfilAction}
        permissoes={permissoes}
        modo="criar"
        valoresIniciais={{
          ativo: true,
          permissoes: [],
        }}
      />
    </div>
  );
}
