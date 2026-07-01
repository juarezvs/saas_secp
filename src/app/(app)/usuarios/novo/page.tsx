import { UserCog } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { criarUsuarioAction } from "@/modules/usuarios/application/actions/criar-usuario.action";
import { listarPerfisAtivosParaUsuario } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { UsuarioForm } from "@/modules/usuarios/presentation/components/usuario-form";

export default async function NovoUsuarioPage() {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const [perfis, orgaos] = await Promise.all([
    listarPerfisAtivosParaUsuario(),
    listarOrgaosAtivos(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Usuários", href: "/usuarios" },
          { label: "Novo usuário" },
        ]}
      />

      <PageHeader
        icon={UserCog}
        titulo="Novo usuário"
        descricao="Cadastre uma conta de acesso ao SECP e vincule os perfis necessários."
        artigo="RBAC dinamico do SECP"
        regraTitulo="Usuários e perfis"
        regraDescricao="O acesso ao sistema é controlado por perfis e permissões, permitindo que cada usuário tenha diferentes escopos de atuação."
      />

      <UsuarioForm
        action={criarUsuarioAction}
        perfis={perfis}
        orgaos={orgaos}
        modo="criar"
        valoresIniciais={{
          tipo: "SERVIDOR",
          ativo: true,
          perfis: [],
        }}
      />
    </div>
  );
}
