import { UserCog } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarUsuarioAction } from "@/modules/usuarios/application/actions/criar-usuario.action";
import { listarPerfisAtivosParaUsuario } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { UsuarioForm } from "@/modules/usuarios/presentation/components/usuario-form";

export default async function NovoUsuarioPage() {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const perfis = await listarPerfisAtivosParaUsuario();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Usuarios", href: "/usuarios" },
          { label: "Novo usuario" },
        ]}
      />

      <PageHeader
        icon={UserCog}
        titulo="Novo usuario"
        descricao="Cadastre uma conta de acesso ao SECP e vincule os perfis necessarios."
        artigo="RBAC dinamico do SECP"
        regraTitulo="Usuarios e perfis"
        regraDescricao="O acesso ao sistema e controlado por perfis e permissoes, permitindo que cada usuario tenha diferentes escopos de atuacao."
      />

      <UsuarioForm
        action={criarUsuarioAction}
        perfis={perfis}
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
