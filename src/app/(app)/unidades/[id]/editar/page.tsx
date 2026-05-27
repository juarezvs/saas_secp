import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarUnidadeAction } from "@/modules/unidades/application/actions/atualizar-unidade.action";
import {
  buscarUnidadePorId,
  listarOrgaosAtivos,
  listarUnidadesParaSelecao,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadeForm } from "@/modules/unidades/presentation/components/unidade-form";

type EditarUnidadePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarUnidadePage({
  params,
}: EditarUnidadePageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const { id } = await params;

  const [unidade, orgaos, unidades] = await Promise.all([
    buscarUnidadePorId(id),
    listarOrgaosAtivos(),
    listarUnidadesParaSelecao(),
  ]);

  if (!unidade) {
    notFound();
  }

  const action = atualizarUnidadeAction.bind(null, unidade.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Unidades", href: "/unidades" },
          { label: unidade.sigla, href: `/unidades/${unidade.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Estrutura institucional
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar unidade
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Atualize os dados cadastrais e a hierarquia da unidade
          organizacional.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Estrutura institucional do SECP"
        titulo="Hierarquia organizacional"
        descricao="A hierarquia das unidades será usada para lotação, chefias, permissões por escopo, homologação mensal, relatórios e futuras integrações com SARH."
      />

      <UnidadeForm
        action={action}
        orgaos={orgaos}
        unidades={unidades}
        unidadeAtualId={unidade.id}
        modo="editar"
        valoresIniciais={{
          orgaoId: unidade.orgaoId,
          unidadePaiId: unidade.unidadePaiId,
          codigo: unidade.codigo,
          sigla: unidade.sigla,
          nome: unidade.nome,
          tipo: unidade.tipo,
          ativo: unidade.ativo,
        }}
      />
    </div>
  );
}