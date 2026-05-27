import Link from "next/link";
import { Building2, UserCheck } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarServidoresAtivosParaGestao,
  listarUnidadesAtivasParaGestao,
  listarUnidadesComGestores,
} from "@/modules/chefias/infrastructure/repositories/chefia.repository";
import { vincularGestorUnidadeAction } from "@/modules/chefias/application/actions/vincular-gestor-unidade.action";
import { GestorUnidadeForm } from "@/modules/chefias/presentation/components/gestor-unidade-form";

function contarGestoresPorPapel(
  gestores: {
    papel: string;
  }[],
  papel: string
) {
  return gestores.filter((gestor) => gestor.papel === papel).length;
}

export default async function ChefiasPage() {
  await exigirPermissaoOuRedirecionar("chefias:gerenciar:global");

  const [unidades, servidores, unidadesComGestores] = await Promise.all([
    listarUnidadesAtivasParaGestao(),
    listarServidoresAtivosParaGestao(),
    listarUnidadesComGestores(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Chefias" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Gestão hierárquica
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Chefias, gestores e delegações
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre gestores titulares, substitutos e delegados responsáveis por
          autorizações, validações e futuras homologações de frequência.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 16, §§ 1º e 2º"
        titulo="Homologação e delegação de competência"
        descricao="A frequência mensal é homologada pelo superior hierárquico, que poderá delegar competência a servidor lotado na unidade, sem afastar sua responsabilidade e a responsabilidade pessoal do delegado."
      />

      <GestorUnidadeForm
        action={vincularGestorUnidadeAction}
        unidades={unidades}
        servidores={servidores}
      />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UserCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Unidades e chefias ativas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Superior</th>
                <th className="px-5 py-3">Titulares</th>
                <th className="px-5 py-3">Substitutos</th>
                <th className="px-5 py-3">Delegados</th>
                <th className="px-5 py-3">Lotados</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {unidadesComGestores.map((unidade) => (
                <tr key={unidade.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{unidade.sigla}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {unidade.nome}
                    </div>
                  </td>

                  <td className="px-5 py-4">{unidade.orgao.sigla}</td>

                  <td className="px-5 py-4">
                    {unidade.unidadePai?.sigla ?? "-"}
                  </td>

                  <td className="px-5 py-4">
                    {contarGestoresPorPapel(
                      unidade.gestores,
                      "GESTOR_TITULAR"
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {contarGestoresPorPapel(
                      unidade.gestores,
                      "GESTOR_SUBSTITUTO"
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {contarGestoresPorPapel(
                      unidade.gestores,
                      "DELEGADO_CHEFIA"
                    )}
                  </td>

                  <td className="px-5 py-4">{unidade._count.lotacoes}</td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/unidades/${unidade.id}/chefias`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <Building2 className="size-4" aria-hidden="true" />
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}

              {unidadesComGestores.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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