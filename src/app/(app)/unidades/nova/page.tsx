import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarUnidadeAction } from "@/modules/unidades/application/actions/criar-unidade.action";
import {
  listarOrgaosAtivos,
  listarUnidadesParaSelecao,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadeForm } from "@/modules/unidades/presentation/components/unidade-form";

export default async function NovaUnidadePage() {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const [orgaos, unidades] = await Promise.all([
    listarOrgaosAtivos(),
    listarUnidadesParaSelecao(),
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

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Estrutura institucional
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Nova unidade organizacional
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre unidades administrativas, judiciais, núcleos, seções,
          subseções, varas, gabinetes e demais estruturas necessárias ao SECP.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 20, inciso I"
        titulo="Gestão técnica pelo NUTEC"
        descricao="A estrutura organizacional será usada pelo sistema para controle de usuários, lotações, chefias, relatórios e demais ações gerenciais do controle de frequência."
      />

      <UnidadeForm
        action={criarUnidadeAction}
        orgaos={orgaos}
        unidades={unidades}
        modo="criar"
        valoresIniciais={{
          ativo: true,
        }}
      />
    </div>
  );
}