import Link from "next/link";
import { Building2, Filter, Network, Plus, UserCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarUnidadesComGestores } from "@/modules/chefias/infrastructure/repositories/chefia.repository";

function contarGestoresPorPapel(
  gestores: {
    papel: string;
  }[],
  papel: string,
) {
  return gestores.filter((gestor) => gestor.papel === papel).length;
}

type ChefiasPageProps = {
  searchParams?: Promise<{
    busca?: string;
    orgao?: string;
    superior?: string;
    chefia?: string;
    apenasComChefia?: string;
  }>;
};

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterTitular(
  unidade: Awaited<ReturnType<typeof listarUnidadesComGestores>>[number],
) {
  return unidade.gestores.find((gestor) => gestor.papel === "GESTOR_TITULAR");
}

export default async function ChefiasPage({ searchParams }: ChefiasPageProps) {
  await exigirPermissaoOuRedirecionar("chefias:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const unidadesComGestores = await listarUnidadesComGestores({
    orgaoIdsPermitidos,
  });
  const buscaNormalizada = normalizarBusca(params.busca);
  const apenasComChefia = params.apenasComChefia === "1";
  const unidadesFiltradas = unidadesComGestores.filter((unidade) => {
    const titular = obterTitular(unidade);
    const textoBusca = normalizarBusca(
      [
        unidade.sigla,
        unidade.nome,
        unidade.orgao.sigla,
        unidade.unidadePai?.sigla,
        titular?.servidor.matricula,
        titular?.servidor.usuario.nome,
      ]
        .filter(Boolean)
        .join(" "),
    );

    if (buscaNormalizada && !textoBusca.includes(buscaNormalizada)) {
      return false;
    }

    if (params.orgao && unidade.orgao.sigla !== params.orgao) {
      return false;
    }

    if (params.superior && unidade.unidadePai?.sigla !== params.superior) {
      return false;
    }

    if (params.chefia === "com" && !titular) {
      return false;
    }

    if (params.chefia === "sem" && titular) {
      return false;
    }

    if (apenasComChefia && unidade.gestores.length === 0) {
      return false;
    }

    return true;
  });
  const orgaosFiltro = Array.from(
    new Set(unidadesComGestores.map((unidade) => unidade.orgao.sigla)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const superioresFiltro = Array.from(
    new Set(
      unidadesComGestores
        .map((unidade) => unidade.unidadePai?.sigla)
        .filter((sigla): sigla is string => Boolean(sigla)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Chefias" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <PageHeader
          icon={Network}
          titulo="Chefias, gestores e delegações"
          descricao="Consulte unidades com gestores titulares, substitutos e delegados responsáveis por autorizações, validações e homologações de frequência."
          artigo="Art. 16, §§ 1º e 2º"
          regraTitulo="Homologação e delegação de competência"
          regraDescricao="A frequência mensal é homologada pelo superior hierárquico, que poderá delegar competência a servidor lotado na unidade, sem afastar sua responsabilidade e a responsabilidade pessoal do delegado."
        />

        <Link
          href="/chefias/vincular"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          Vincular chefia
        </Link>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="space-y-4 border-b p-5">
          <div className="flex items-center gap-2">
            <UserCheck className="size-5 text-blue-900 dark:text-blue-300" />
            <h2 className="text-lg font-bold">Unidades e chefias ativas</h2>
          </div>

          <form method="GET" className="grid gap-3 lg:grid-cols-7">
            <input
              type="text"
              name="busca"
              defaultValue={params.busca ?? ""}
              placeholder="Unidade, chefe ou matrícula"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm lg:col-span-2"
            />
            <select
              name="orgao"
              defaultValue={params.orgao ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todos os órgãos</option>
              {orgaosFiltro.map((orgao) => (
                <option key={orgao} value={orgao}>
                  {orgao}
                </option>
              ))}
            </select>
            <select
              name="superior"
              defaultValue={params.superior ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todas superiores</option>
              {superioresFiltro.map((superior) => (
                <option key={superior} value={superior}>
                  {superior}
                </option>
              ))}
            </select>
            <select
              name="chefia"
              defaultValue={params.chefia ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="com">Com chefia titular</option>
              <option value="sem">Sem chefia titular</option>
            </select>
            <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold">
              <input
                type="checkbox"
                name="apenasComChefia"
                value="1"
                defaultChecked={apenasComChefia}
                className="size-4 accent-blue-900"
              />
              Só unidades com chefia
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950"
              >
                <Filter className="size-4" aria-hidden="true" />
                Filtrar
              </button>
              <Link
                href="/chefias"
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
              >
                Limpar
              </Link>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Chefia titular</th>
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
              {unidadesFiltradas.map((unidade) => {
                const titular = obterTitular(unidade);

                return (
                  <tr key={unidade.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{unidade.sigla}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {unidade.nome}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {titular ? (
                        <div>
                          <div className="font-semibold">
                            {titular.servidor.matricula}
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {titular.servidor.usuario.nome}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">
                          Não designado
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">{unidade.orgao.sigla}</td>
                    <td className="px-5 py-4">
                      {unidade.unidadePai?.sigla ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      {contarGestoresPorPapel(
                        unidade.gestores,
                        "GESTOR_TITULAR",
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {contarGestoresPorPapel(
                        unidade.gestores,
                        "GESTOR_SUBSTITUTO",
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {contarGestoresPorPapel(
                        unidade.gestores,
                        "DELEGADO_CHEFIA",
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
                );
              })}

              {unidadesFiltradas.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma unidade encontrada para os filtros informados.
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
