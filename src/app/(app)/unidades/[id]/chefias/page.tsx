import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarUnidadeComGestores,
  listarServidoresAtivosParaGestao,
  listarUnidadesAtivasParaGestao,
} from "@/modules/chefias/infrastructure/repositories/chefia.repository";
import { vincularGestorUnidadeAction } from "@/modules/chefias/application/actions/vincular-gestor-unidade.action";
import { resolverChefiaResponsavelDaUnidade } from "@/modules/chefias/application/services/resolver-chefia.service";
import { GestorUnidadeForm } from "@/modules/chefias/presentation/components/gestor-unidade-form";
import { GestoresUnidadeCard } from "@/modules/chefias/presentation/components/gestores-unidade-card";

type UnidadeChefiasPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UnidadeChefiasPage({
  params,
}: UnidadeChefiasPageProps) {
  await exigirPermissaoOuRedirecionar("chefias:gerenciar:global");

  const { id } = await params;

  const [unidade, unidades, servidores, chefiaResolvida] = await Promise.all([
    buscarUnidadeComGestores(id),
    listarUnidadesAtivasParaGestao(),
    listarServidoresAtivosParaGestao(),
    resolverChefiaResponsavelDaUnidade(id),
  ]);

  if (!unidade) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Chefias", href: "/chefias" },
          { label: unidade.sigla },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Chefias da unidade
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {unidade.sigla}
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          {unidade.nome}
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 16"
        titulo="Responsabilidade pela homologação"
        descricao="Os superiores hierárquicos deverão homologar a frequência mensal dos servidores sob sua subordinação, analisando comparecimentos, ausências, horas-débito e horas-crédito."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Chefia responsável resolvida</h2>

        {chefiaResolvida ? (
          <div className="mt-3 rounded-lg border bg-[var(--muted)] p-4">
            <p className="font-semibold">{chefiaResolvida.nome}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Matrícula: {chefiaResolvida.matricula} • Papel:{" "}
              {chefiaResolvida.papel}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {chefiaResolvida.herdada
                ? "Chefia herdada da unidade superior."
                : "Chefia definida diretamente nesta unidade."}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Nenhuma chefia titular ativa foi encontrada nesta unidade nem em sua
            hierarquia superior.
          </p>
        )}
      </section>

      <GestoresUnidadeCard unidadeId={unidade.id} gestores={unidade.gestores} />

      <GestorUnidadeForm
        action={vincularGestorUnidadeAction}
        unidades={unidades}
        servidores={servidores}
        unidadeFixaId={unidade.id}
      />
    </div>
  );
}