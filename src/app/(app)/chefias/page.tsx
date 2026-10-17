import { Select as SelectPesquisavel } from "@/components/ui/form-controls";

import Link from "next/link";
import { Building2, Filter, Network, UserCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableHeaderCheckbox, DataTablePageSize, DataTablePagination, DataTableRowCheckbox, DataTableSelectionProvider, StandardDataTable } from "@/components/listagens";
import { ChefiasListagemControles } from "@/modules/chefias/presentation/components/chefias-listagem-controles";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
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
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterChefiaTitular(
  unidade: Awaited<ReturnType<typeof listarUnidadesComGestores>>[number],
) {
  return unidade.chefiaResolvida;
}

export default async function ChefiasPage({ searchParams }: ChefiasPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "chefias:gerenciar:global",
    "chefias:gerenciar:seccional",
    "homologacao:gerenciar:chefia",
    "minha-equipe:consultar:chefia",
  ]);

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    permissoes: permissao.permissoes,
  });
  const unidadeIdsPermitidos = perfilChefiaAtivo
    ? await listarIdsUnidadesSubordinadasPorUsuario(permissao.usuarioId ?? "")
    : undefined;
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const unidadesComGestores = await listarUnidadesComGestores({
    orgaoIdsPermitidos,
  }).then((unidades) =>
    unidadeIdsPermitidos
      ? unidades.filter((unidade) => unidadeIdsPermitidos.includes(unidade.id))
      : unidades,
  );
  const buscaNormalizada = normalizarBusca(params.busca);
  const apenasComChefia = params.apenasComChefia === "1";
  const unidadesFiltradas = unidadesComGestores.filter((unidade) => {
    const chefiaTitular = obterChefiaTitular(unidade);
    const textoBusca = normalizarBusca(
      [
        unidade.sigla,
        unidade.nome,
        unidade.orgao.sigla,
        unidade.unidadePai?.sigla,
        chefiaTitular?.matricula,
        chefiaTitular?.nome,
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

    if (params.chefia === "com" && !chefiaTitular) {
      return false;
    }

    if (params.chefia === "sem" && chefiaTitular) {
      return false;
    }

    if (apenasComChefia && !chefiaTitular) {
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
  const itensPorPagina = Math.max(1, Number(params.itensPorPagina ?? 10));
  const totalPaginas = Math.max(1, Math.ceil(unidadesFiltradas.length / itensPorPagina));
  const pagina = Math.min(Math.max(1, Number(params.pagina ?? 1)), totalPaginas);
  const unidadesPagina = unidadesFiltradas.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const baseParams = new URLSearchParams();
  for (const chave of ["busca", "orgao", "superior", "chefia"] as const) if (params[chave]) baseParams.set(chave, params[chave]!);
  baseParams.set("itensPorPagina", String(itensPorPagina));
  function montarHrefPagina(novaPagina: number) { const query = new URLSearchParams(baseParams); query.set("pagina", String(novaPagina)); return `/chefias?${query}`; }

  return (
    <div className="space-y-3">
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

      </section>

      <DataTableSelectionProvider>
      <section className="overflow-hidden border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">
        <div className="hidden">
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
            <SelectPesquisavel
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
            </SelectPesquisavel>
            <SelectPesquisavel
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
            </SelectPesquisavel>
            <SelectPesquisavel
              name="chefia"
              defaultValue={params.chefia ?? ""}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="com">Com chefia titular</option>
              <option value="sem">Sem chefia titular</option>
            </SelectPesquisavel>
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

        <div className="border-b border-[var(--border)] px-3 pt-1"><div className="inline-flex h-10 items-center gap-2 border-b-2 border-[var(--secp-theme-accent)] px-2"><h2 className="text-sm font-semibold">Unidades e chefias ativas</h2><span className="text-xs text-[var(--muted-foreground)]">{unidadesFiltradas.length}</span></div></div>
        <div className="flex min-h-10 flex-wrap items-center border-b border-[var(--border)]"><div className="min-w-0 flex-1"><ChefiasListagemControles orgaos={orgaosFiltro} superiores={superioresFiltro} /></div><div className="ml-auto flex items-center gap-1 px-2 py-1"><DataTablePageSize value={itensPorPagina} command /><DataTablePagination pagina={pagina} totalPaginas={totalPaginas} montarHrefPagina={montarHrefPagina} command /></div></div>
        <StandardDataTable columns={[{ key: "unidade", label: "Unidade" }, { key: "chefia", label: "Chefia titular" }, { key: "orgao", label: "Orgao" }, { key: "superior", label: "Superior" }, { key: "titulares", label: "Titulares" }, { key: "substitutos", label: "Substitutos" }, { key: "delegados", label: "Delegados" }, { key: "lotados", label: "Lotados" }]} rows={unidadesPagina.map((unidade) => { const chefia = obterChefiaTitular(unidade); return { id: unidade.id, label: unidade.sigla, visualizarHref: `/unidades/${unidade.id}/chefias`, cells: { unidade: { value: unidade.sigla, detail: unidade.nome }, chefia: { value: chefia?.matricula ?? "Nao designado", detail: chefia ? `${chefia.nome}${chefia.herdada ? " (herdada da superior)" : ""}` : undefined }, orgao: { value: unidade.orgao.sigla }, superior: { value: unidade.unidadePai?.sigla ?? "-" }, titulares: { value: contarGestoresPorPapel(unidade.gestores, "GESTOR_TITULAR") }, substitutos: { value: contarGestoresPorPapel(unidade.gestores, "GESTOR_SUBSTITUTO") }, delegados: { value: contarGestoresPorPapel(unidade.gestores, "DELEGADO_CHEFIA") }, lotados: { value: unidade._count.lotacoes } } }; })} emptyMessage="Nenhuma unidade encontrada para os filtros informados." minWidth={1120} />
        <div className="hidden">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="w-10 px-3 py-3"><DataTableHeaderCheckbox ids={unidadesPagina.map((item) => item.id)} /></th>
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
              {unidadesPagina.map((unidade) => {
                const chefiaTitular = obterChefiaTitular(unidade);

                return (
                  <tr key={unidade.id} className="border-b last:border-b-0">
                    <td className="px-3 py-4"><DataTableRowCheckbox id={unidade.id} label={`Selecionar ${unidade.sigla}`} /></td>
                    <td className="px-5 py-4">
                      <div className="font-semibold">{unidade.sigla}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {unidade.nome}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {chefiaTitular ? (
                        <div>
                          <div className="font-semibold">
                            {chefiaTitular.matricula}
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {chefiaTitular.nome}
                            {chefiaTitular.herdada
                              ? " (herdada da superior)"
                              : ""}
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

              {unidadesPagina.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
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
      </DataTableSelectionProvider>
    </div>
  );
}
