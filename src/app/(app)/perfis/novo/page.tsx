import Link from "next/link";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";

export default async function NovoPerfilPage() {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

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
          Nesta tela será criado o formulário completo para cadastro de perfis e
          vinculação de permissões.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Modelo RBAC do SECP"
        titulo="Perfis customizados"
        descricao="O SECP permitirá criar perfis personalizados, associando permissões específicas para cada papel institucional ou operacional."
      />

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">
          Formulário será implementado na próxima etapa
        </h2>

        <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
          Antes de criar o formulário, precisamos criar o componente genérico de
          formulário, o componente de seleção de permissões e a server action de
          criação de perfil.
        </p>

        <div className="mt-6">
          <Link
            href="/perfis"
            className="inline-flex rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
          >
            Voltar para perfis
          </Link>
        </div>
      </section>
    </div>
  );
}
