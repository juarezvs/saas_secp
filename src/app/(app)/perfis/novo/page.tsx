import { ShieldAlert } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarPerfilAction } from "@/modules/perfis/application/actions/criar-perfil.action";
import {
  listarPerfisParaFiltro,
  listarPermissoesOrdenadas,
} from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { PerfilForm } from "@/modules/perfis/presentation/components/perfil-form";

export default async function NovoPerfilPage() {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const [permissoes, perfisDestinoExcecao] = await Promise.all([
    listarPermissoesOrdenadas(),
    listarPerfisParaFiltro(),
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
        modo="criar"
        valoresIniciais={{
          ativo: true,
          administrativo: false,
          excecao: false,
          perfilDestinoExcecaoId: null,
          permissoes: [],
        }}
      />
    </div>
  );
}
