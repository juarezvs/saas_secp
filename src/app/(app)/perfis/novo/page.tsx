import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
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
          { label: "Administração", href: "/administracao" },
          { label: "Perfis e permissões", href: "/perfis" },
          { label: "Novo perfil" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Controle de acesso
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">Novo perfil</h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Crie um perfil institucional e associe permissões de acordo com as
          responsabilidades do usuário no SECP.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Modelo RBAC do SECP"
        titulo="Perfis customizados"
        descricao="O SECP permite criar perfis personalizados para refletir responsabilidades institucionais, administrativas, técnicas, gerenciais e de consulta."
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
