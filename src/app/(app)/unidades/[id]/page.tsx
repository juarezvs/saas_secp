import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Edit, UsersRound, UserCheck } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarUnidadePorId } from "@/modules/unidades/infrastructure/repositories/unidade.repository";
import { UnidadeHierarquiaCard } from "@/modules/unidades/presentation/components/unidade-hierarquia-card";

type UnidadeDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UnidadeDetalhePage({
  params,
}: UnidadeDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const { id } = await params;
  const unidade = await buscarUnidadePorId(id);

  if (!unidade) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Unidades", href: "/unidades" },
          { label: unidade.sigla },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Unidade organizacional
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {unidade.sigla}
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
            {unidade.nome}
          </p>

          <p className="mt-2 font-mono text-xs text-(--muted-foreground)">
            Código: {unidade.codigo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/unidades/${unidade.id}/chefias`}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <UserCheck className="size-4" aria-hidden="true" />
            Chefias
          </Link>

          <Link
            href={`/unidades/${unidade.id}/editar`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Edit className="size-4" aria-hidden="true" />
            Editar unidade
          </Link>
        </div>
      </section>

      <RegraPortariaCard
        artigo="Arts. 3º, 16 e 17"
        titulo="Unidade como base da frequência"
        descricao="A unidade organizacional será usada para lotação, acompanhamento de frequência, homologação mensal pela chefia e emissão/encaminhamento do Boletim de Frequência."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <p className="text-sm text-(--muted-foreground)">Órgão</p>
          <h2 className="mt-2 text-2xl font-bold">{unidade.orgao.sigla}</h2>
        </div>

        <div className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <p className="text-sm text-(--muted-foreground)">Tipo</p>
          <h2 className="mt-2 text-base font-bold">{unidade.tipo}</h2>
        </div>

        <div className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <p className="text-sm text-(--muted-foreground)">Lotados</p>
          <h2 className="mt-2 text-2xl font-bold">{unidade._count.lotacoes}</h2>
        </div>

        <div className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <p className="text-sm text-(--muted-foreground)">Status</p>
          <h2 className="mt-2 text-2xl font-bold">
            {unidade.ativo ? "Ativa" : "Inativa"}
          </h2>
        </div>
      </section>

      <UnidadeHierarquiaCard
        unidadePai={unidade.unidadePai}
        unidadesFilhas={unidade.unidadesFilhas}
      />

      <section className="rounded-xl border bg-(--card) text-(--card-foreground) shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Gestores cadastrados</h2>
        </div>

        <div className="divide-y">
          {unidade.gestores.map((gestor) => (
            <div
              key={gestor.id}
              className="flex flex-col justify-between gap-2 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{gestor.servidor.usuario.nome}</p>
                <p className="text-sm text-(--muted-foreground)">
                  Matrícula: {gestor.servidor.matricula}
                </p>
              </div>

              <span className="w-fit rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                {gestor.papel}
              </span>
            </div>
          ))}

          {unidade.gestores.length === 0 && (
            <div className="p-8 text-center text-sm text-(--muted-foreground)">
              Nenhum gestor cadastrado para esta unidade.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-(--card) text-(--card-foreground) shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <Building2 className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Servidores lotados</h2>
        </div>

        <div className="divide-y">
          {unidade.lotacoes.map((lotacao) => (
            <div
              key={lotacao.id}
              className="flex flex-col justify-between gap-2 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{lotacao.servidor.usuario.nome}</p>
                <p className="text-sm text-(--muted-foreground)">
                  Matrícula: {lotacao.servidor.matricula}
                </p>
              </div>

              <span className="w-fit rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                {lotacao.tipo}
              </span>
            </div>
          ))}

          {unidade.lotacoes.length === 0 && (
            <div className="p-8 text-center text-sm text-(--muted-foreground)">
              Nenhum servidor lotado nesta unidade.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
