import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
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
          { label: "Administração", href: "/administracao" },
          { label: "Usuários", href: "/usuarios" },
          { label: "Novo usuário" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Administração de acessos
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Novo usuário
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre uma conta de acesso ao SECP e vincule os perfis necessários.
        </p>
      </section>

      <RegraPortariaCard
        artigo="RBAC dinâmico do SECP"
        titulo="Usuários e perfis"
        descricao="O acesso ao sistema é controlado por perfis e permissões, permitindo que cada usuário tenha diferentes escopos de atuação."
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