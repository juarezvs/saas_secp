import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarUnidadesOrganizacionais } from "@/modules/unidades/infrastructure/repositories/unidade.repository";

export default async function UnidadesPage() {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const unidades = await listarUnidadesOrganizacionais();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Unidades" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Estrutura institucional
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Unidades organizacionais
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            Cadastre e mantenha a estrutura organizacional usada para lotação,
            chefia, homologação, relatórios e controle de frequência.
          </p>
        </div>

        <Link
          href="/unidades/nova"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova unidade
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 1º, 3º, 16 e 20"
        titulo="Abrangência institucional e gestão da frequência"
        descricao="A estrutura de unidades permite controlar frequência, homologações, boletins e responsabilidades gerenciais dentro da Seção Judiciária do Amazonas, subseções e unidades vinculadas."
      />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <Building2 className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Unidades cadastradas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Sigla</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Superior</th>
                <th className="px-5 py-3">Subunidades</th>
                <th className="px-5 py-3">Lotados</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {unidades.map((unidade) => (
                <tr key={unidade.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {unidade.sigla}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">{unidade.nome}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                      {unidade.codigo}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {unidade.tipo}
                  </td>

                  <td className="px-5 py-4">{unidade.orgao.sigla}</td>

                  <td className="px-5 py-4">
                    {unidade.unidadePai ? unidade.unidadePai.sigla : "-"}
                  </td>

                  <td className="px-5 py-4">
                    {unidade._count.unidadesFilhas}
                  </td>

                  <td className="px-5 py-4">{unidade._count.lotacoes}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        unidade.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {unidade.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/unidades/${unidade.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {unidades.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma unidade cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}