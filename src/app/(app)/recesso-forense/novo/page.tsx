import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarRecessoForenseAction } from "@/modules/recesso-forense/application/actions/recesso-forense.actions";
import { RecessoForenseForm } from "@/modules/recesso-forense/presentation/components/recesso-forense-form";

export default async function NovoRecessoForensePage() {
  await exigirPermissaoOuRedirecionar("recesso:gerenciar:global");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: "Novo recesso" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Recesso forense
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Novo recesso
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre o periodo anual proprio do recesso. O sistema fixa o intervalo
          normativo de 20/12 a 06/01.
        </p>
      </section>

      <RecessoForenseForm action={criarRecessoForenseAction} />
    </div>
  );
}
